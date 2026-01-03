
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1'; // Use v1 explicitly to match source
import * as firebaseFunctionsTest from 'firebase-functions-test';

// Initialize the test SDK
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

// Import after mocking
import { createOrder } from '../src/index';

describe('createOrder', () => {
  let dbMock: any;
  let collectionMock: any;
  let docMock: any;
  let getMock: any;
  let setMock: any;
  let wrappedCreateOrder: any;

  beforeAll(() => {
    wrappedCreateOrder = testEnv.wrap(createOrder);
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mock chain
    setMock = jest.fn().mockResolvedValue({});
    getMock = jest.fn(); // Will be customized per test
    docMock = jest.fn(() => ({
      get: getMock,
      set: setMock,
      id: 'order_123',
    }));
    collectionMock = jest.fn(() => ({
      doc: docMock,
    }));
    dbMock = {
      collection: collectionMock,
    };
    (admin.firestore as unknown as jest.Mock).mockReturnValue(dbMock);
  });

  const context = {
    auth: { uid: 'user123' },
  } as functions.https.CallableContext;

  const validData = {
    items: [{ productId: 'prod1', quantity: 2 }],
    shippingAddress: { line1: '123 St' },
    paymentMethod: 'COD',
  };

  test('should calculate tax and delivery fee when settings are enabled', async () => {
    // Mock Product lookup & Settings
    collectionMock.mockImplementation((collectionName: string) => {
      if (collectionName === 'products') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ name: 'Test Product', price: 100 }),
            }),
          })),
        };
      }
      if (collectionName === 'settings') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                tax: { enabled: true, rate: 18, type: 'exclusive' },
                deliveryFee: { enabled: true, amount: 50 },
              }),
            }),
          })),
        };
      }
      if (collectionName === 'orders') {
        return {
          doc: jest.fn(() => ({
            id: 'order_123',
            set: setMock,
          })),
        };
      }
      return { doc: jest.fn() };
    });

    await wrappedCreateOrder(validData, context);

    // Assertions
    // Subtotal = 100 * 2 = 200
    // Tax = (200 * 18) / 100 = 36
    // Delivery = 50
    // Total = 200 + 36 + 50 = 286

    expect(setMock).toHaveBeenCalledTimes(1);
    const orderPayload = setMock.mock.calls[0][0];

    expect(orderPayload.financials.subtotal).toBe(200);
    expect(orderPayload.financials.tax).toBe(36);
    expect(orderPayload.financials.deliveryFee).toBe(50);
    expect(orderPayload.financials.totalAmount).toBe(286);
  });

  test('should default tax and delivery to 0 if settings missing or disabled', async () => {
      // Mock Product lookup
      collectionMock.mockImplementation((collectionName: string) => {
        if (collectionName === 'products') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ name: 'Test Product', price: 100 }),
              }),
            })),
          };
        }
        if (collectionName === 'settings') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                   // Missing or disabled
                   tax: { enabled: false, rate: 18 },
                   deliveryFee: { enabled: false, amount: 50 },
                }),
              }),
            })),
          };
        }
        if (collectionName === 'orders') {
            return {
              doc: jest.fn(() => ({
                id: 'order_123',
                set: setMock,
              })),
            };
          }
        return { doc: jest.fn() };
      });

      await wrappedCreateOrder(validData, context);

      const orderPayload = setMock.mock.calls[0][0];

      expect(orderPayload.financials.subtotal).toBe(200);
      expect(orderPayload.financials.tax).toBe(0);
      expect(orderPayload.financials.deliveryFee).toBe(0);
      expect(orderPayload.financials.totalAmount).toBe(200);
    });
});
