import { ref, computed, VNode, watch, h, readonly } from 'vue'
import {
  defineFieldType,
  FieldContext,
  FieldProps,
  newFieldId,
} from '@/lib/fields'
import { OfIcon } from '@/components/Icon'

export const FileField = defineFieldType({
  name: 'file',
  setup(props: FieldProps, ctx: FieldContext) {
    const initialValue = computed(() => {
      let initial = ctx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })
    const stateValue = ref()
    watch(
      () => ctx.value,
      (val) => {
        if (val === undefined || val === '') val = null
        stateValue.value = val
      },
      {
        immediate: true,
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

    const focus = () => {
      elt.value?.focus()
    }
    const clickOpen = (_evt?: MouseEvent) => {
      elt.value?.focus()
      elt.value?.click()
      return false
    }
    const clickClear = (evt?: MouseEvent) => {
      if (!elt.value) {
        return
      }
      elt.value.value = ''
      // FIXME shouldn't need to set stateValue here
      if (evt) {
        evt.stopPropagation()
        evt.preventDefault()
      }
      stateValue.value = null
      if (ctx.onUpdate) ctx.onUpdate(null)
    }
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onChange(evt: InputEvent) {
        const files = (evt.target as HTMLInputElement).files
        let val = null
        if (files && files.length) {
          val = { name: files[0].name }
        }
        // FIXME shouldn't need to set stateValue here
        stateValue.value = val
        if (ctx.onUpdate) ctx.onUpdate(val)
      },
      onClick(evt: MouseEvent) {
        evt.stopPropagation()
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onVnodeMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLInputElement
      },
    }

    return readonly({
      append() {
        if (stateValue.value)
          return h(OfIcon, {
            name: 'circle-cross',
            size: 'input',
            onClick: clickClear,
          })
      },
      blank: computed(() => !stateValue.value),
      class: computed(() => {
        return { 'of-file-field': true }
      }),
      content: () => {
        let label
        if (stateValue.value) {
          label = h(
            'label',
            {
              class: [
                'of-field-input-label',
                'of--align-' + (props.align || 'start'),
              ],
              for: inputId.value,
              onClick: (evt: MouseEvent) => evt.stopPropagation(),
            },
            stateValue.value.name
          )
        } else {
          label = h(
            'label',
            {
              class: [
                'of-field-input-label',
                'of--align-' + (props.align || 'start'),
                'of--text-placeholder',
              ],
              for: inputId.value,
              onClick: (evt: MouseEvent) => evt.stopPropagation(),
            },
            [props.placeholder || 'Attach a file']
          )
        }
        return h('div', { class: 'of-file-input' }, [
          h('input', {
            class: 'of-field-input',
            id: inputId.value,
            // disabled: disabled.value,
            name: ctx.name,
            type: 'file',
            ...hooks,
          }),
          label,
        ])
      },
      click: clickOpen,
      cursor: 'pointer', // FIXME depends if editable
      focus,
      focused,
      // hovered,
      inputId,
      // inputValue,
      // loading
      // messages
      prepend() {
        return h(OfIcon, { name: 'attach', size: 'input' })
      },
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
    })
  },
})
