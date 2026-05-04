export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: string
  emailVerified: boolean
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
}

export interface Document {
  id: string
  title: string
  description?: string
  fileName: string
  fileSize: number
  status: DocumentStatus
  ownerId: string
  owner: User
  organizationId?: string
  organization?: Organization
  fields: Field[]
  signatures: Signature[]
  recipients: Recipient[]
  signingOrder: boolean
  requireAllSignatures: boolean
  emailSubject?: string
  emailMessage?: string
  expiresAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type DocumentStatus = 
  | 'DRAFT' 
  | 'PENDING' 
  | 'SENT' 
  | 'PARTIALLY_SIGNED' 
  | 'COMPLETED' 
  | 'VOIDED' 
  | 'EXPIRED' 
  | 'DECLINED'

export interface Template {
  id: string
  name: string
  description?: string
  category?: string
  fileName: string
  fields: Field[]
  ownerId: string
  owner: User
  organizationId?: string
  organization?: Organization
  usageCount: number
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface Field {
  id: string
  type: FieldType
  label?: string
  placeholder?: string
  page: number
  x: number
  y: number
  width: number
  height: number
  value?: string
  defaultValue?: string
  options?: FieldOption[]
  required: boolean
  readOnly: boolean
  assignedTo?: string
  signerId?: string
  order: number
}

export type FieldType = 
  | 'SIGNATURE' 
  | 'INITIALS' 
  | 'DATE' 
  | 'TEXT' 
  | 'CHECKBOX' 
  | 'RADIO' 
  | 'DROPDOWN' 
  | 'EMAIL' 
  | 'NAME' 
  | 'COMPANY' 
  | 'TITLE' 
  | 'STAMP' 
  | 'ATTACHMENT'

export interface FieldOption {
  label: string
  value: string
}

export interface Signature {
  id: string
  fieldId: string
  documentId: string
  signerId?: string
  signerEmail: string
  signerName?: string
  signerIp?: string
  signerUserAgent?: string
  type: SignatureType
  signatureData: string
  signedAt: string
  verified: boolean
}

export type SignatureType = 'DRAWN' | 'TYPED' | 'UPLOADED' | 'DIGITAL'

export interface Recipient {
  email: string
  name: string
  role: string
  status: RecipientStatus
  order?: number
}

export type RecipientStatus = 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED'

export interface Signer {
  email: string
  name: string
  order?: number
}

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED'
  lastDeliveredAt?: string
  createdAt: string
}

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt?: string
  useCount: number
  expiresAt?: string
  revoked: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  action: string
  userId?: string
  documentId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface Subscription {
  id: string
  tier: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE'
  status: string
  documentsPerMonth: number
  signersPerDocument: number
  templatesLimit: number
  apiAccess: boolean
  customBranding: boolean
  webhooksEnabled: boolean
  currentPeriodStart?: string
  currentPeriodEnd?: string
}
