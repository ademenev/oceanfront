import { VNode, ref, SetupContext, computed, Ref, watch, PropType } from 'vue'
import { ExtractPropTypes, readonly, h } from '@vue/runtime-core'
import {
  defineFieldFormat,
  FieldContext,
  FieldProps,
  newFieldId,
  FieldSetup
} from './fields'

export interface InputRendered {
  // bullet?: string | boolean  use suffix
  class?: string | string[]
  content: () => VNode | undefined
  cursor?: string
  dirty?: boolean
  // error, hint, counter
  focus?: () => void
  focused?: boolean
  icon?: string
  inputId?: string
  inputMode?: string
  popup?: VNode | string
  prefix?: () => VNode | undefined // should support both prefixed controls and prefix text
  suffix?: () => VNode | string | undefined
}

export const _InputProps = {
  align: String, // start, center, end (change checkbox position based on align?)
  class: [String, Array],
  disabled: Boolean,
  format: [String, Function, Object], // should be created by now?
  icon: String, // overrides formatter
  id: String,
  loading: Boolean,
  maxlength: Number,
  name: String,
  placeholder: String,
  prefix: String,
  readonly: Boolean,
  suffix: String
}

// of-input format=".." type=".."  type overrides format

// density is an of-field property

// list fields are more complicated because we support
// multiple fields. probably cannot be editable in this case, except with a custom control
// look at project assignment widgets for a complex field example

// editing a list field does not necessarily mean swapping input to edit mode
// it may/should show a popup instead
// but sometimes we do want to embed the editable control in a list view
// editable != can-edit  again
// editable = popup is good to support in general

// which is responsible for rendering display content, input or formatter?
// pass from formatter to input? input doesn't seem to be aware of formatter
// pass 'input processor' and validation (rules) function to input

import { useFormats, TextFormatterProp } from '../lib/format'

// const copyAttrs = new Set(['autocomplete', 'placeholder', 'size', 'value'])

// types that can be inherited from state.type
// setting state.inputType allows any value
const allowInputTypes = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'tel',
  'time',
  'week',
  'url'
])

const inputTypeFrom = (type?: string) => {
  if (type && allowInputTypes.has(type)) return type
  return 'text'
}

/*
export const InputProps = {
  align: String as PropType<'start' | 'center' | 'end'>,
  class: String,
  defaultValue: {},
  disabled: [Boolean, String],
  format: [String, Function, Object] as PropType<FormatterProp>,
  formatOptions: Object as PropType<Record<string, any>>,
  icon: String,
  id: String,
  initialValue: {},
  // items:
  label: String,
  maxlength: [Number, String],
  name: String,
  placeholder: String,
  prefix: String,
  readonly: [Boolean, String],
  required: [Boolean, String],
  suffix: String,
  value: {},
  variant: String
}
export type InputPropTypes = ExtractPropTypes<typeof InputProps, false>

export const inputMixin = (props: InputPropTypes, ctx: SetupContext) => {
  const formatMgr = useFormats()
  const formatter = computed(() =>
    formatMgr.getFormatter(props.format, props.formatOptions)
  )
  const initialValue = computed(() => props.value)
  const stateValue = ref(initValue)
  if (formatter.value) {
    initValue = formatter.value.format(initValue)
  }
  const inputValue = ref(initValue)
  watch(
    () => props.value,
    val => {
      inputValue.value = val
    }
  )
  const elt = ref<HTMLInputElement | undefined>()
  const disabled = computed(() => props.disabled)
  const focused = ref(false)
  const readonly = computed(() => props.readonly && !disabled.value)
  const id = props.id || 'input-' + Math.round(Math.random() * 1000) // FIXME
  const value: Ref<any> = computed({
    get: () => {
      // FIXME format stored value
      // computed() can be generated by the formatter
      inputValue.value
    },
    set: (val: any) => {
      // FIXME unformat value
      inputValue.value = val
    }
  })
  const formatValue = computed(() => {
    if (formatter.value) return formatter.value.format(stateValue.value)
    return inputValue.value
  })
  watch(
    () => formatValue.value,
    fmtVal => {
      if (!focused.value && elt.value) {
        elt.value.value = fmtVal as string
      }
    }
  )
  const blank = computed(() => {
    // FIXME ask formatter
    const val = inputValue.value
    return val === undefined || val === null || val === ''
  })
  const fieldAttrs = computed(() => ({
    blank: blank.value,
    class: ['of-field-text', props.class],
    disabled: disabled.value,
    focused: focused.value,
    inputId: id,
    label: props.label,
    readonly: readonly.value,
    variant: props.variant
  }))
  const attrs = computed(() => ({
    id,
    class: [
      'of-field-input',
      formatter.value?.inputClass,
      'of--text-' + (props.align || 'start')
    ],
    disabled: disabled.value,
    inputmode: formatter.value?.inputMode,
    maxlength: props.maxlength,
    name: props.name,
    placeholder: props.placeholder,
    readonly: readonly.value,
    value: initValue,
    onBlur(evt: FocusEvent) {
      focused.value = false
    },
    onChange(evt: Event) {
      if (formatter.value) {
        inputValue.value = formatter.value.format(elt.value?.value)
        return
      }
      inputValue.value = elt.value?.value
    },
    onFocus(evt: FocusEvent) {
      focused.value = true
    },
    onInput(evt: InputEvent) {
      if (formatter.value) {
        const upd = formatter.value.handleInput(evt)
        if (upd) {
          if (!upd.updated) return
          elt.value!.value = upd.value!
          elt.value!.setSelectionRange(upd.selStart!, upd.selEnd!)
          stateValue.value = upd.nativeValue
        }
      }
      // inputValue.value = elt.value?.value // FIXME - makes safari jump to end of input
      // will become update:modelInput with modelValue bound to change event
      ctx.emit('update:modelValue', inputValue.value)
    },
    onKeydown(evt: KeyboardEvent) {
      if (formatter.value) {
        formatter.value.handleKeyDown(evt)
      }
    }
  }))
  return {
    attrs,
    elt,
    fieldAttrs
  }
}
*/

export const textInput = defineFieldFormat(
  (props: FieldProps, ctx: FieldContext) => {
    const formatMgr = useFormats()
    const formatter = computed(() =>
      formatMgr.getTextFormatter(props.type, props.formatOptions)
    )
    const initialValue = computed(() => {
      let initial = ctx.initialValue
      if (initial === undefined) initial = props.defaultValue
      const fmt = formatter.value
      if (fmt) {
        const fval = fmt.format(initial)
        if (fval.error)
          console.error('Error loading initial value:', fval.error)
        else initial = fval.value
      }
      if (initial === undefined) initial = null
      return initial
    })

    let lazyInputValue: string
    const inputValue = ref('')
    const pendingValue = ref()
    const stateValue = ref()
    watch(
      () => ctx.value,
      val => {
        const fmt = formatter.value
        if (fmt) {
          const fval = fmt.format(val)
          if (fval.error) {
            console.error('Error loading field value:', fval.error, val)
          } else {
            lazyInputValue = fval.inputValue ?? ''
            val = fval.value
          }
        } else {
          if (val === null || val === undefined) lazyInputValue = ''
          else lazyInputValue = ('' + val).trim()
          val = lazyInputValue
        }
        if (val === undefined || val === '') val = null
        inputValue.value = lazyInputValue
        stateValue.value = val
        pendingValue.value = undefined
      },
      {
        immediate: true
      }
    )
    const elt = ref<HTMLInputElement | undefined>()
    const focused = ref(false)
    let defaultFieldId: string
    const inputId = computed(() => {
      let id = ctx.id
      if (!id) {
        if (!defaultFieldId) defaultFieldId = newFieldId()
        id = defaultFieldId
      }
      return id
    })
    const focus = (select?: boolean) => {
      if (elt.value) {
        elt.value.focus()
        if (select) elt.value.select()
        return true
      }
    }
    const hooks = {
      onBlur(evt: FocusEvent) {
        focused.value = false
      },
      onFocus(evt: FocusEvent) {
        focused.value = true
      },
      onChange(evt: Event) {
        lazyInputValue = (evt.target as HTMLInputElement)?.value
        let val = formatter.value
          ? formatter.value.unformat(lazyInputValue)
          : lazyInputValue
        stateValue.value = val
        inputValue.value = lazyInputValue
        if (ctx.onUpdate) ctx.onUpdate(val)
      },
      onInput(evt: InputEvent) {
        const fmt = formatter.value
        if (fmt?.handleInput) {
          const upd = fmt.handleInput(evt)
          if (upd) {
            if (!upd.updated) return
            let inputElt = evt.target as HTMLInputElement
            let iVal = upd.inputValue ?? ''
            inputElt.value = iVal
            if (upd.selStart !== undefined) {
              inputElt.setSelectionRange(upd.selStart!, upd.selEnd!)
            }
            lazyInputValue = iVal
            pendingValue.value = upd.value
          }
        }
      },
      onKeydown(evt: KeyboardEvent) {
        const fmt = formatter.value
        if (fmt?.handleKeyDown) {
          fmt.handleKeyDown(evt)
        }
      },
      onVnodeMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLInputElement
      }
    }
    return readonly({
      blank: computed(() => {
        // FIXME ask formatter
        const val = inputValue.value
        return val === undefined || val === null || val === ''
      }),
      class: 'of-field-text',
      content: () => {
        const fmt = formatter.value
        return h('input', {
          type: fmt?.inputType || 'text',
          class: [
            'of-field-input',
            fmt?.inputClass,
            'of--text-' + (props.align || fmt?.align || 'start')
          ],
          inputmode: fmt?.inputMode,
          id: inputId.value,
          maxlength: props.maxlength,
          name: ctx.name,
          placeholder: props.placeholder, // FIXME allow formatter override
          readonly: ctx.mode === 'readonly' || ctx.locked,
          value: lazyInputValue,
          ...hooks
          // ctx.label as aria label
        })
      },
      click: () => focus(true),
      cursor: 'text', // FIXME depends if editable
      focus,
      focused,
      // hovered,
      inputId,
      inputValue,
      // loading
      // messages
      pendingValue,
      // popup? - if autocomplete
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue
    })
  }
)