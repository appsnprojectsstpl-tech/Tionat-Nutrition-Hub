
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import * as firebaseFunctionsTest from 'firebase-functions-test';

const testEnv = firebaseFunctionsTest();

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const firestore = jest.fn();
  // @ts-ignore
  firestore.FieldValue = {
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
    arrayUnion: jest.fn((val) => val),
  };
  return {
    initializeApp: jest.fn(),
    firestore: firestore,
  };
});

// Mock Razorpay
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({ id: 'rzp_order_123' }),
    },
  }));
});

import { createOrder } from '../src/index';

describe('createOrder', () => {
  let dbMock: any;
  let collectionMock: any;
  let docMock: any;
  let getAllMock: any;
  let batchMock: any;
  let wrappedCreateOrder: any;

  beforeAll(() => {
    wrappedCreateOrder = testEnv.wrap(createOrder);
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Batch
    batchMock = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    };

    // Mock GetAll
    getAllMock = jest.fn();

    // Mock Doc (recursive to support subcollections)
    docMock = jest.fn((id) => ({
      id: id || 'mock_id',
      get: jest.fn(),
      set: jest.fn(),
      collection: (name: string) => collectionMock(name), // Lazy binding to support recursion
    }));

    // Mock Collection
    collectionMock = jest.fn((name) => {
        if (name === 'settings') {
            return {
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({
                            tax: { enabled: true, rate: 10 },
                            deliveryFee: { enabled: true, amount: 50 }
                        })
                    }),
                    collection: (name: string) => collectionMock(name),
                }))
            }
        }
        return {
            doc: docMock
        };
    });

    dbMock = {
      collection: collectionMock,
      getAll: getAllMock,
      batch: jest.fn(() => batchMock),
    };

    (admin.firestore as unknown as jest.Mock).mockReturnValue(dbMock);
  });

  const context = {
    auth: { uid: 'user123' },
  } as functions.https.CallableContext;

  const validData = {
    items: [{ productId: 'prod1', quantity: 2, name: 'Test Product' }],
    shippingAddress: { line1: '123 St' },
    paymentMethod: 'COD',
  };

  test('should create order successfully with correct financials', async () => {
    // Setup getAll to return product snapshots + inventory snapshots
    getAllMock.mockResolvedValue([
      // Product Snap
      {
        exists: true,
        data: () => ({ name: 'Test Product', price: 100, image: 'img.jpg' }),
      },
      // Inventory Snap (Sufficient Stock)
      {
        exists: true,
        data: () => ({ stock: 10 }),
      },
    ]);

    const result = await wrappedCreateOrder(validData, context);

    expect(result.success).toBe(true);
    expect(result.totalAmount).toBe(270);

    expect(batchMock.set).toHaveBeenCalledTimes(2);
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  test('should default tax and delivery to 0 if settings missing or disabled', async () => {
    // Override settings mock
    collectionMock.mockImplementation((name: string) => {
        if (name === 'settings') {
            return {
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({
                            tax: { enabled: false },
                            deliveryFee: { enabled: false }
                        })
                    }),
                    collection: (name: string) => collectionMock(name),
                }))
            }
        }
        return { doc: docMock };
    });

    getAllMock.mockResolvedValue([
        {
          exists: true,
          data: () => ({ name: 'Test Product', price: 100 }),
        },
        {
          exists: true,
          data: () => ({ stock: 10 }),
        },
      ]);

      const result = await wrappedCreateOrder(validData, context);

      // 100 * 2 = 200. Tax 0, Fee 0.
      expect(result.totalAmount).toBe(200);

      const payload = batchMock.set.mock.calls[0][1];
      expect(payload.financials.tax).toBe(0);
      expect(payload.financials.deliveryFee).toBe(0);
  });

  test('should throw error if product price is missing', async () => {
    getAllMock.mockResolvedValue([
      {
        exists: true,
        data: () => ({ name: 'Bad Product' }), // No price
      },
      {
        exists: true,
        data: () => ({ stock: 10 }),
      },
    ]);

    await expect(wrappedCreateOrder(validData, context)).rejects.toThrow('Price error');
  });

  test('should throw error if product not found', async () => {
    getAllMock.mockResolvedValue([
      {
        exists: false,
      },
      {
        exists: true,
        data: () => ({ stock: 10 }),
      },
    ]);

    await expect(wrappedCreateOrder(validData, context)).rejects.toThrow('Product "Test Product" is no longer available');
  });

  test('should throw error if inventory is missing', async () => {
    getAllMock.mockResolvedValue([
      {
        exists: true,
        data: () => ({ name: 'Test Product', price: 100 }),
      },
      {
        exists: false, // Inventory missing
      },
    ]);

    await expect(wrappedCreateOrder(validData, context)).rejects.toThrow('Inventory missing');
  });

  test('should throw error if stock is insufficient', async () => {
    getAllMock.mockResolvedValue([
      {
        exists: true,
        data: () => ({ name: 'Test Product', price: 100 }),
      },
      {
        exists: true,
        data: () => ({ stock: 1 }), // Stock 1, Requested 2
      },
    ]);

    await expect(wrappedCreateOrder(validData, context)).rejects.toThrow('Insufficient stock');
  });
});
