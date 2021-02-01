import { Ref, readonly, ref, toRaw, watch, markRaw } from 'vue'
import { ConfigManager, Config } from './config'
import { looseEqual, readonlyUnref } from './util'

interface FieldRecordState {
  pending?: boolean
  invalid?: boolean
  locked?: boolean
  updated?: boolean
}

export interface FieldRecord {
  initialValue: Record<string, any> | null
  invalid?: boolean
  lock(options?: LockOptions): Lock | null
  locked?: boolean
  pending?: boolean
  required?: Record<string, boolean>
  reset(): void
  updated?: boolean
  value: Record<string, any>
}

export interface LockOptions {
  reason?: string
}

export interface Lock {
  release(): void
}

class BasicRecord<T extends object = Record<string, any>>
  implements FieldRecord {
  _initial: Ref<Readonly<T>>
  _required: Ref<Record<string, boolean>>
  _rules: Ref<((value: T) => boolean)[]>
  _state: Ref<FieldRecordState>
  _value: Ref<T>

  constructor(initial?: T) {
    const init = toRaw(initial || {}) as T
    this._initial = ref(readonly(init)) as Ref<Readonly<T>>
    this._required = ref({})
    this._rules = ref([])
    this._state = ref({ locked: false })
    this._value = ref(Object.assign({}, init)) as Ref<T>
    watch(
      () => [this._initial.value, this._value.value],
      ([init, vals]) => {
        this._checkUpdated(init, vals)
      },
      { deep: true, immediate: true }
    )
  }

  _checkUpdated(init: T, vals: T) {
    let invalid = false
    this._state.value.updated = !looseEqual(init, vals)
    for (const rule of this._rules.value) {
      if (!rule(vals)) {
        invalid = true
      }
    }
    for (const k in this._required.value) {
      if (!vals[k as keyof T]) {
        invalid = true
      }
    }
    this._state.value.invalid = invalid
    // FIXME set messages
  }

  get initialValue(): Readonly<T> | null {
    return this._initial.value
  }

  get invalid(): boolean {
    return this._state.value.invalid || false
  }

  lock(_options?: LockOptions): Lock | null {
    if (this.locked) {
      return null
    }
    this._state.value.locked = true
    return {
      release: () => {
        this._state.value.locked = false
      },
    }
  }

  get locked(): boolean {
    return this._state.value.locked || false
  }

  set locked(flag: boolean) {
    console.log(`lock! {flag}`, flag)
    this._state.value.locked = flag
  }

  get pending(): boolean {
    return this._state.value.pending || false
  }

  reset() {
    this._value.value = this._initial.value
  }

  get updated(): boolean {
    return this._state.value.updated || false
  }

  get value(): T {
    return this._value.value
  }
}

export const makeRecord = (initial?: Record<string, any>): BasicRecord => {
  return markRaw(new BasicRecord(initial))
}

export interface RecordManagerState {
  getCurrentRecord(): FieldRecord | null
}

class RecordManager implements RecordManagerState {
  currentRecord: FieldRecord | null = null

  getCurrentRecord(): FieldRecord | null {
    return this.currentRecord
  }
}

const configManager = new ConfigManager('ofrec', RecordManager)

export function setCurrentRecord(record?: FieldRecord | null): void {
  configManager.extendingManager.currentRecord = record || null
}

export function useRecords(config?: Config): RecordManagerState {
  const mgr = configManager.inject(config)
  return readonlyUnref(mgr)
}
