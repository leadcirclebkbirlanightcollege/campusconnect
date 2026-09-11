// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── IN-MEMORY ACCESS TOKEN CACHE ─────────────────────────────────────────────
interface CachedToken {
  token: string
  expiresAt: number
}
let cachedAccessToken: CachedToken | null = null

// ── DRIVE PROVIDER CONFIGURATION ─────────────────────────────────────────────
// Supports $0/month Personal Google Drive (default) and upgradeable to Workspace Shared Drive
interface DriveProviderConfig {
  type: 'personal' | 'shared_drive'
  clientId: string
  clientSecret: string
  refreshToken: string
  rootFolderId?: string | null
  sharedDriveId?: string | null
}

function cleanSecret(val: string | undefined | null): string {
  if (!val) return ''
  let s = val.trim()
  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function getDriveConfig(): DriveProviderConfig {
  const clientId = cleanSecret(Deno.env.get('GOOGLE_CLIENT_ID'))
  const clientSecret = cleanSecret(Deno.env.get('GOOGLE_CLIENT_SECRET'))
  const refreshToken = cleanSecret(Deno.env.get('GOOGLE_REFRESH_TOKEN'))
  const rootFolderId = cleanSecret(Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')) || null
  const sharedDriveId = cleanSecret(Deno.env.get('GOOGLE_DRIVE_SHARED_DRIVE_ID')) || null
  const type = (cleanSecret(Deno.env.get('GOOGLE_DRIVE_TYPE')) || (sharedDriveId ? 'shared_drive' : 'personal')) as
    | 'personal'
    | 'shared_drive'

  const missing: string[] = []
  if (!clientId) missing.push('GOOGLE_CLIENT_ID')
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET')
  if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN')

  if (missing.length > 0) {
    const err: any = new Error('GOOGLE_OAUTH_CONFIG_MISSING')
    err.missing = missing
    throw err
  }

  return {
    type,
    clientId,
    clientSecret,
    refreshToken,
    rootFolderId,
    sharedDriveId,
  }
}

// ── OAUTH 2.0 REFRESH TOKEN ACCESS TOKEN EXCHANGE ────────────────────────────
async function getOAuthAccessToken(config: DriveProviderConfig): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
    return cachedAccessToken.token
  }

  // 1. Standard body parameters
  const bodyParams = new URLSearchParams()
  bodyParams.set('client_id', config.clientId)
  bodyParams.set('client_secret', config.clientSecret)
  bodyParams.set('refresh_token', config.refreshToken)
  bodyParams.set('grant_type', 'refresh_token')

  let res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
  })

  // 2. If 401 unauthorized_client, also try RFC-compliant Authorization: Basic header
  if (res.status === 401) {
    try {
      const basicAuth = btoa(`${config.clientId}:${config.clientSecret}`)
      const basicParams = new URLSearchParams()
      basicParams.set('refresh_token', config.refreshToken)
      basicParams.set('grant_type', 'refresh_token')

      const resBasic = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
        body: basicParams.toString(),
      })
      if (resBasic.ok) {
        res = resBasic
      }
    } catch {
      // Keep original response
    }
  }

  if (!res.ok) {
    const errText = await res.text()
    let errorDetail = errText
    try {
      const parsed = JSON.parse(errText)
      errorDetail = `${parsed.error || ''}${parsed.error_description ? ': ' + parsed.error_description : ''}`
    } catch {
      // Keep errText
    }
    throw new Error(`Google OAuth token refresh failed (${res.status}): ${errorDetail}`)
  }

  const tokenData = await res.json()
  cachedAccessToken = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600) * 1000,
  }
  return cachedAccessToken.token
}

// ── FOLDER RESOLUTION & CREATION (PERSONAL / SHARED DRIVE) ────────────────────
async function ensureDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string | null,
  isSharedDrive = false
): Promise<string> {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`
  }

  const listUrl = new URL('https://www.googleapis.com/drive/v3/files')
  listUrl.searchParams.set('q', query)
  listUrl.searchParams.set('fields', 'files(id, name)')
  if (isSharedDrive) {
    listUrl.searchParams.set('supportsAllDrives', 'true')
    listUrl.searchParams.set('includeItemsFromAllDrives', 'true')
  }

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (listRes.ok) {
    const data = await listRes.json()
    if (data.files && data.files.length > 0) {
      return data.files[0].id
    }
  }

  // Create folder
  const meta: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentFolderId) {
    meta.parents = [parentFolderId]
  }

  const createUrl = new URL('https://www.googleapis.com/drive/v3/files')
  if (isSharedDrive) {
    createUrl.searchParams.set('supportsAllDrives', 'true')
  }

  const createRes = await fetch(createUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meta),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Failed to create Google Drive folder "${folderName}": ${err}`)
  }

  const folderData = await createRes.json()
  return folderData.id
}

// ── FILE UPLOAD (PERSONAL / SHARED DRIVE) ────────────────────────────────────
async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileBytes: Uint8Array,
  parentFolderId?: string | null,
  isSharedDrive = false
): Promise<{ fileId: string; webViewLink?: string; webContentLink?: string }> {
  const metadata: any = {
    name: fileName,
    mimeType,
  }
  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const boundary = '-------CampusConnectDriveUpload' + Math.random().toString(36).slice(2)
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metaHeader = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`
  const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`

  const encoder = new TextEncoder()
  const metaPart = encoder.encode(metaHeader)
  const mediaPart = encoder.encode(mediaHeader)
  const closePart = encoder.encode(closeDelimiter)

  const bodyLength = metaPart.length + mediaPart.length + fileBytes.length + closePart.length
  const body = new Uint8Array(bodyLength)
  let offset = 0
  body.set(metaPart, offset); offset += metaPart.length
  body.set(mediaPart, offset); offset += mediaPart.length
  body.set(fileBytes, offset); offset += fileBytes.length
  body.set(closePart, offset)

  const uploadUrl = new URL('https://www.googleapis.com/upload/drive/v3/files')
  uploadUrl.searchParams.set('uploadType', 'multipart')
  if (isSharedDrive) {
    uploadUrl.searchParams.set('supportsAllDrives', 'true')
  }
  uploadUrl.searchParams.set('fields', 'id,name,mimeType,size,webViewLink,webContentLink')

  const res = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(bodyLength),
    },
    body,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Google Drive upload failed (${res.status}): ${errText}`)
  }

  const result = await res.json()
  return {
    fileId: result.id,
    webViewLink: result.webViewLink,
    webContentLink: result.webContentLink,
  }
}

async function deleteFileFromDrive(
  accessToken: string,
  fileId: string,
  isSharedDrive = false
): Promise<boolean> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`)
  if (isSharedDrive) {
    url.searchParams.set('supportsAllDrives', 'true')
  }
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.ok || res.status === 404
}

async function getDriveFileMetadata(
  accessToken: string,
  fileId: string,
  isSharedDrive = false
): Promise<any> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`)
  url.searchParams.set('fields', 'id,name,mimeType,size,webViewLink,webContentLink,trashed')
  if (isSharedDrive) {
    url.searchParams.set('supportsAllDrives', 'true')
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Failed to read Drive file (${res.status})`)
  }
  return await res.json()
}

async function setDriveFilePublic(
  accessToken: string,
  fileId: string,
  isSharedDrive = false
): Promise<void> {
  try {
    const permUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`)
    if (isSharedDrive) {
      permUrl.searchParams.set('supportsAllDrives', 'true')
    }
    await fetch(permUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    })
  } catch (e) {
    console.warn('Could not set public permission on Drive file:', e)
  }
}

// ── MAIN EDGE FUNCTION ───────────────────────────────────────────────────────
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/storage-google-drive/, '')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // ── STATUS / HEALTH CHECK (Public Diagnostic) ───────────────────────────
    if (path === '/status' || path === '') {
      let isConfigured = false
      let missingKeys: string[] = []
      let driveType = 'personal'
      let rootFolder = 'Campus Connect (auto)'
      let oauthValid = false
      let rootFolderReady = false
      let oauthError: string | null = null

      let config: DriveProviderConfig | null = null
      try {
        config = getDriveConfig()
        driveType = config.type
        rootFolder = config.rootFolderId || 'Campus Connect (auto)'
        isConfigured = true // All required configuration secrets exist!

        try {
          const accessToken = await getOAuthAccessToken(config)
          oauthValid = !!accessToken

          // Verify or create root folder on Google Drive
          const isShared = config.type === 'shared_drive'
          let effectiveRootId = config.rootFolderId
          if (!effectiveRootId) {
            effectiveRootId = await ensureDriveFolder(accessToken, 'Campus Connect', null, isShared)
          }
          rootFolder = effectiveRootId
          rootFolderReady = true
        } catch (tokenErr: any) {
          oauthValid = false
          const rawMsg = tokenErr?.message || String(tokenErr)
          oauthError = rawMsg.replace(/(client_secret|refresh_token|Bearer)\s*[:=]\s*[^\s&]+/gi, '$1=[REDACTED]')
          console.error('[storage-google-drive] OAuth verification error:', oauthError)
        }
      } catch (err: any) {
        isConfigured = false
        if (err.missing) missingKeys = err.missing
      }

      const clientIdValid = config ? config.clientId.includes('.apps.googleusercontent.com') : false
      const refreshTokenValidFormat = config ? config.refreshToken.startsWith('1//') : false

      return jsonResponse(200, {
        status: 'ok',
        google_drive: {
          configured: isConfigured,
          oauth_valid: oauthValid,
          root_folder_ready: rootFolderReady,
          provider_type: driveType,
          root_folder: rootFolder,
          missing_keys: missingKeys,
          diagnostics: {
            client_id_format_valid: clientIdValid,
            client_secret_length: config ? config.clientSecret.length : 0,
            refresh_token_format_valid: refreshTokenValidFormat,
          },
          ...(oauthError ? { oauth_error: oauthError } : {}),
        },
      })
    }

    // ── AUTHENTICATION CHECK FOR PRIVILEGED OPERATIONS ──────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Authentication required' })
    }

    const jwt = authHeader.replace('Bearer ', '')
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: authError } = await callerClient.auth.getUser(jwt)
    if (authError || !userData?.user) {
      return jsonResponse(401, { error: 'Invalid or expired authentication token' })
    }

    const user = userData.user

    // Fetch caller's role & college
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role, college_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const userRole = roleData?.role || 'student'
    const userCollegeId = roleData?.college_id || null
    const isAdminOrSuper = ['admin', 'super_admin'].includes(userRole)
    const isFaculty = userRole === 'faculty'

    // ── FILE UPLOAD ─────────────────────────────────────────────────────────
    if (req.method === 'POST' && (path === '/upload' || path === '/')) {
      let config: DriveProviderConfig
      let accessToken: string

      try {
        config = getDriveConfig()
        accessToken = await getOAuthAccessToken(config)
      } catch (e: any) {
        if (e.message === 'GOOGLE_OAUTH_CONFIG_MISSING') {
          return jsonResponse(503, {
            error: 'Google Drive OAuth credentials not configured',
            code: 'GOOGLE_OAUTH_CONFIG_MISSING',
            missing_secrets: e.missing || ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
            details:
              'Please configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN via Supabase secrets.',
          })
        }
        return jsonResponse(502, {
          error: 'Google OAuth token refresh failed',
          code: 'GOOGLE_OAUTH_AUTH_FAILED',
          details: e.message || 'Failed to authenticate with Google OAuth.',
        })
      }

      const contentType = req.headers.get('content-type') || ''
      let fileBytes: Uint8Array
      let fileName = 'unnamed-file'
      let mimeType = 'application/octet-stream'
      let entityType = 'general'
      let entityId: string | null = null
      let accessLevel = 'private'
      let collegeId = userCollegeId

      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        if (!file) return jsonResponse(400, { error: 'No file provided in form-data' })

        fileName = (formData.get('file_name') as string) || file.name
        mimeType = file.type || 'application/octet-stream'
        entityType = (formData.get('entity_type') as string) || 'general'
        entityId = (formData.get('entity_id') as string) || null
        accessLevel = (formData.get('access_level') as string) || 'private'
        if (formData.get('college_id')) {
          collegeId = formData.get('college_id') as string
        }

        const arrayBuffer = await file.arrayBuffer()
        fileBytes = new Uint8Array(arrayBuffer)
      } else {
        const body = await req.json()
        if (!body.file_base64) {
          return jsonResponse(400, { error: 'Missing file_base64 in JSON payload' })
        }
        fileName = body.file_name || 'unnamed-file'
        mimeType = body.mime_type || 'application/octet-stream'
        entityType = body.entity_type || 'general'
        entityId = body.entity_id || null
        accessLevel = body.access_level || 'private'
        if (body.college_id) collegeId = body.college_id

        const binaryStr = atob(body.file_base64)
        fileBytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0))
      }

      // Authorization check for upload
      if (!isAdminOrSuper && !isFaculty) {
        if (!['submission', 'student_id', 'avatar'].includes(entityType)) {
          return jsonResponse(403, {
            error: 'Students may only upload submissions, student ID cards, or avatars',
          })
        }
      }

      // Maximum file size limit for free tier: 50MB per file
      const MAX_SIZE = 50 * 1024 * 1024
      if (fileBytes.length > MAX_SIZE) {
        return jsonResponse(400, {
          error: `File size exceeds maximum allowed limit (50MB)`,
        })
      }

      // Sanitize file name
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')

      // Resolve root folder in personal Drive or configured Shared Drive
      const isShared = config.type === 'shared_drive'
      let effectiveRootId = config.rootFolderId
      if (!effectiveRootId) {
        effectiveRootId = await ensureDriveFolder(accessToken, 'Campus Connect', null, isShared)
      }

      // Subfolder hierarchy
      const folderMap: Record<string, string> = {
        document: 'Academics',
        academic: 'Academics',
        assignment: 'Assignments',
        submission: 'Assignments',
        event: 'Events',
        notice: 'Notices',
        certificate: 'Certificates',
        student_id: 'Student Documents',
        media: 'Media',
        avatar: 'Media',
        general: 'General',
      }
      const subfolderName = folderMap[entityType] || 'General'
      const targetFolderId = await ensureDriveFolder(
        accessToken,
        subfolderName,
        effectiveRootId,
        isShared
      )

      // Upload file to Personal Google Drive
      const driveUpload = await uploadFileToDrive(
        accessToken,
        `${Date.now()}_${safeName}`,
        mimeType,
        fileBytes,
        targetFolderId,
        isShared
      )

      if (accessLevel !== 'private') {
        await setDriveFilePublic(accessToken, driveUpload.fileId, isShared)
      }

      // Public web view link and direct download link
      const driveUrl =
        driveUpload.webViewLink ||
        `https://drive.google.com/file/d/${driveUpload.fileId}/view`
      const downloadLink =
        driveUpload.webContentLink ||
        `https://drive.google.com/uc?id=${driveUpload.fileId}&export=download`

      // Insert file metadata in Supabase PostgreSQL
      const { data: fileRecord, error: dbError } = await adminClient
        .from('storage_files')
        .insert({
          college_id: collegeId,
          file_name: safeName,
          original_file_name: fileName,
          mime_type: mimeType,
          file_size: fileBytes.length,
          google_drive_file_id: driveUpload.fileId,
          google_drive_folder_id: targetFolderId,
          drive_url: driveUrl,
          drive_download_link: downloadLink,
          entity_type: entityType,
          entity_id: entityId,
          access_level: accessLevel,
          uploaded_by: user.id,
          status: 'active',
          metadata: {
            webViewLink: driveUpload.webViewLink,
            webContentLink: driveUpload.webContentLink,
            folder: subfolderName,
            provider: config.type,
          },
        })
        .select()
        .single()

      if (dbError) {
        // Rollback: Delete orphaned file from Google Drive
        console.error('Database insertion failed, rolling back Drive file:', dbError)
        await deleteFileFromDrive(accessToken, driveUpload.fileId, isShared).catch(() => {})
        return jsonResponse(500, { error: 'Failed to record file metadata', details: dbError.message })
      }

      return jsonResponse(201, {
        success: true,
        file: fileRecord,
      })
    }

    // ── FILE DOWNLOAD / PROXY STREAM ─────────────────────────────────────────
    if (req.method === 'GET' && path.startsWith('/download/')) {
      const fileId = path.replace('/download/', '').trim()
      if (!fileId) return jsonResponse(400, { error: 'File ID is required' })

      const { data: fileRecord, error: fetchErr } = await adminClient
        .from('storage_files')
        .select('*')
        .eq('id', fileId)
        .eq('status', 'active')
        .maybeSingle()

      if (fetchErr || !fileRecord) {
        return jsonResponse(404, { error: 'File not found' })
      }

      // Verify user permissions
      const hasAccess = await adminClient.rpc('check_storage_file_access', {
        p_file_id: fileId,
        p_user_id: user.id,
      })

      if (!hasAccess.data) {
        return jsonResponse(403, { error: 'Access denied to this file' })
      }

      const config = getDriveConfig()
      const accessToken = await getOAuthAccessToken(config)
      const isShared = config.type === 'shared_drive'

      const fetchUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileRecord.google_drive_file_id}`)
      fetchUrl.searchParams.set('alt', 'media')
      if (isShared) {
        fetchUrl.searchParams.set('supportsAllDrives', 'true')
      }

      const driveRes = await fetch(fetchUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!driveRes.ok) {
        const err = await driveRes.text()
        return jsonResponse(driveRes.status, {
          error: 'Failed to retrieve file from Google Drive',
          details: err,
        })
      }

      const headers = new Headers(corsHeaders)
      headers.set('Content-Type', fileRecord.mime_type || 'application/octet-stream')
      headers.set(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileRecord.file_name)}"`
      )
      if (driveRes.headers.get('content-length')) {
        headers.set('Content-Length', driveRes.headers.get('content-length')!)
      }

      return new Response(driveRes.body, { status: 200, headers })
    }

    // ── DELETE FILE ─────────────────────────────────────────────────────────
    if (req.method === 'DELETE' && path.startsWith('/file/')) {
      const fileId = path.replace('/file/', '').trim()
      if (!fileId) return jsonResponse(400, { error: 'File ID is required' })

      const { data: fileRecord } = await adminClient
        .from('storage_files')
        .select('*')
        .eq('id', fileId)
        .maybeSingle()

      if (!fileRecord) {
        return jsonResponse(404, { error: 'File not found' })
      }

      // Check authorization
      const isOwner = fileRecord.uploaded_by === user.id
      if (!isAdminOrSuper && !isOwner) {
        return jsonResponse(403, { error: 'Unauthorized to delete this file' })
      }

      // Delete from Drive
      try {
        const config = getDriveConfig()
        const accessToken = await getOAuthAccessToken(config)
        await deleteFileFromDrive(accessToken, fileRecord.google_drive_file_id, config.type === 'shared_drive')
      } catch (err: any) {
        console.warn('Could not delete file from Google Drive:', err.message)
      }

      // Update metadata status to deleted
      const { error: updateErr } = await adminClient
        .from('storage_files')
        .update({ status: 'deleted' })
        .eq('id', fileId)

      if (updateErr) {
        return jsonResponse(500, { error: 'Failed to update database status' })
      }

      return jsonResponse(200, { success: true, message: 'File deleted successfully' })
    }

    // ── RECONCILE / CONSISTENCY CHECK ───────────────────────────────────────
    if (req.method === 'POST' && path === '/reconcile') {
      if (!isAdminOrSuper) {
        return jsonResponse(403, { error: 'Admin access required' })
      }

      const config = getDriveConfig()
      const accessToken = await getOAuthAccessToken(config)
      const isShared = config.type === 'shared_drive'

      const { data: files } = await adminClient
        .from('storage_files')
        .select('id, google_drive_file_id, file_name, status')
        .eq('status', 'active')
        .limit(100)

      const report: any[] = []
      for (const f of files || []) {
        const driveMeta = await getDriveFileMetadata(accessToken, f.google_drive_file_id, isShared)
        if (!driveMeta || driveMeta.trashed) {
          await adminClient
            .from('storage_files')
            .update({ status: 'inaccessible' })
            .eq('id', f.id)
          report.push({ id: f.id, name: f.file_name, status: 'missing_in_drive' })
        } else {
          report.push({ id: f.id, name: f.file_name, status: 'consistent' })
        }
      }

      return jsonResponse(200, { success: true, count: files?.length || 0, report })
    }

    return jsonResponse(404, { error: 'Endpoint not found' })
  } catch (err: any) {
    console.error('Google Drive storage function error:', err)
    return jsonResponse(500, {
      error: err.message || 'Internal server error',
    })
  }
})
