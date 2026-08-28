import { describe, expect, it } from 'vitest'
import { ACTION_OUTCOME, OUTCOME, outcomeOf } from './outcome'
import { KNOWN_AUDIT_ACTIONS } from '../components/common/badges'

describe('outcome map', () => {
  it('every known audit action maps to exactly one of the four buckets', () => {
    for (const action of KNOWN_AUDIT_ACTIONS) {
      const bucket = outcomeOf(action)
      expect(Object.keys(OUTCOME)).toContain(bucket)
    }
  })

  it('every ACTION_OUTCOME value is a valid bucket', () => {
    for (const bucket of Object.values(ACTION_OUTCOME)) {
      expect(OUTCOME[bucket]).toBeDefined()
    }
  })

  it('unknown action falls back to pending', () => {
    expect(outcomeOf('nonsense_action')).toBe('pending')
  })
})
