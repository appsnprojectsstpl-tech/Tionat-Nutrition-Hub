
import * as admin from 'firebase-admin';
import * as firebaseFunctionsTest from 'firebase-functions-test';

// Initialize the test SDK
const testEnv = firebaseFunctionsTest();

// Mock objects defined outside to be accessible? No, must be inside factory or attached.
// We will attach them to the firestore function mock.

jest.mock('firebase-admin', () => {
  const collectionMock = jest.fn();
  const getAllMock = jest.fn();
  const batchMock = jest.fn();
  const settingsMock = jest.fn();

  const dbInstance = {
      collection: collectionMock,
      getAll: getAllMock,
      batch: batchMock,
      settings: settingsMock
  };

  const firestore = jest.fn(() => dbInstance);

  // Attach for access in tests
  (firestore as any)._dbInstance = dbInstance;

  // @ts-ignore
  firestore.FieldValue = {
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
    increment: jest.fn((val) => val),
  };
  // @ts-ignore
  firestore.Timestamp = {
      now: jest.fn(() => ({ toMillis: () => Date.now() })),
  };

  return {
    initializeApp: jest.fn(),
    firestore: firestore,
    auth: jest.fn(() => ({
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user123' }),
    })),
  };
});

// Import after mocking
import { createOrderHTTP } from '../src/index';

describe('createOrderHTTP', () => {
  let dbMock: any;
  let collectionMock: any;
  let getAllMock: any;
  let batchMock: any;

  let docMock: any;
  let getMock: any;
  let batchSetMock: any;
  let batchUpdateMock: any;
  let batchCommitMock: any;

  let req: any;
  let res: any;

  beforeAll(() => {
    // Retrieve the mock instance that was returned to src/index.ts
    dbMock = (admin.firestore as any)._dbInstance;
    collectionMock = dbMock.collection;
    getAllMock = dbMock.getAll;
    batchMock = dbMock.batch;
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mock behaviors
    getMock = jest.fn();

    // Forward declaration to allow circular reference
    docMock = jest.fn();

    const docObj = {
        get: getMock,
        id: 'new_order_id',
        ref: { path: 'ref' },
        collection: collectionMock
    };

    docMock.mockReturnValue(docObj);

    // Default collection behavior
    collectionMock.mockImplementation(() => ({
      doc: docMock,
      where: jest.fn(() => ({
          limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ empty: true })
          }))
      }))
    }));

    batchSetMock = jest.fn();
    batchUpdateMock = jest.fn();
    batchCommitMock = jest.fn().mockResolvedValue(true);
    batchMock.mockReturnValue({
        set: batchSetMock,
        update: batchUpdateMock,
        commit: batchCommitMock
    });

    // Setup Request and Response
    req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: {
            data: {
                items: [{ productId: 'prod1', quantity: 2 }],
                shippingAddress: { line1: '123 St' },
                paymentMethod: 'COD'
            }
        }
    };
    res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        setHeader: jest.fn(),
        getHeader: jest.fn(),
    };
  });

  const waitForResponse = () => {
      return new Promise((resolve) => {
          res.json.mockImplementation((data: any) => resolve(data));
          res.send.mockImplementation((data: any) => resolve(data));
      });
  };

  test('should create order when stock is sufficient', async () => {
    getAllMock
      .mockResolvedValueOnce([ // Products
          {
              exists: true,
              data: () => ({ name: 'Test Product', price: 100, stock: 0 })
          }
      ])
      .mockResolvedValueOnce([ // Inventory
          {
              exists: true,
              data: () => ({ stock: 10 })
          }
      ]);

    // Settings mock
    getMock.mockResolvedValue({
        data: () => ({})
    });

    const promise = waitForResponse();
    await createOrderHTTP(req, res);
    await promise;

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        result: expect.objectContaining({ success: true })
    }));
  });

  test('should fail when stock is insufficient (from Inventory)', async () => {
    getAllMock
      .mockResolvedValueOnce([ // Products
          {
              exists: true,
              data: () => ({ name: 'Test Product', price: 100 })
          }
      ])
      .mockResolvedValueOnce([ // Inventory
          {
              exists: true,
              data: () => ({ stock: 1 }) // Less than requested 2
          }
      ]);

    const promise = waitForResponse();
    await createOrderHTTP(req, res);
    await promise;

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'failed-precondition' })
    }));
  });

  test('should use fallback stock when inventory doc is missing', async () => {
    getAllMock
      .mockResolvedValueOnce([ // Products
          {
              exists: true,
              data: () => ({ name: 'Test Product', price: 100, stock: 5 }) // Fallback stock 5
          }
      ])
      .mockResolvedValueOnce([ // Inventory
          {
              exists: false // Missing
          }
      ]);

    // Settings mock
    getMock.mockResolvedValue({
        data: () => ({})
    });

    const promise = waitForResponse();
    await createOrderHTTP(req, res);
    await promise;

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        result: expect.objectContaining({ success: true })
    }));
  });

  test('should fail when fallback stock is insufficient', async () => {
    getAllMock
      .mockResolvedValueOnce([ // Products
          {
              exists: true,
              data: () => ({ name: 'Test Product', price: 100, stock: 1 }) // Fallback stock 1 < 2
          }
      ])
      .mockResolvedValueOnce([ // Inventory
          {
              exists: false
          }
      ]);

    const promise = waitForResponse();
    await createOrderHTTP(req, res);
    await promise;

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'failed-precondition' })
    }));
  });
});
