import { auth, isFirestoreQuotaError, markQuotaExhausted } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lower = errorMessage.toLowerCase();

  // Gracefully absorb quota-exhausted and offline-client states without throwing or logging console.error
  if (
    isFirestoreQuotaError(error) ||
    lower.includes('quota') ||
    lower.includes('client is offline') ||
    lower.includes('unavailable') ||
    lower.includes('network-request-failed') ||
    lower.includes('failed to fetch')
  ) {
    if (isFirestoreQuotaError(error) || lower.includes('quota')) {
      markQuotaExhausted(error);
    }
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore notice:', JSON.stringify(errInfo));
}
