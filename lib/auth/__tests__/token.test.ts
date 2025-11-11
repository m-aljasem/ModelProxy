import { hashToken, verifyToken } from '../token'

describe('Token utilities', () => {
  it('should hash and verify tokens', async () => {
    const token = 'test-token-123'
    const hash = await hashToken(token)
    
    expect(hash).toBeDefined()
    expect(hash).not.toBe(token)
    
    const isValid = await verifyToken(token, hash)
    expect(isValid).toBe(true)
    
    const isInvalid = await verifyToken('wrong-token', hash)
    expect(isInvalid).toBe(false)
  })
})

