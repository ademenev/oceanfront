import { ref, computed, watch, h, VNode, VNodeTypes } from 'vue'
import { OfNavGroup } from '../components/NavGroup'
import { OfListItem } from '../components/ListItem'
import { OfIcon } from '../components/Icon'
import {
  defineFieldType,
  FieldContext,
  FieldProps,
  newFieldId,
  fieldRender,
} from '../lib/fields'
import { useItems } from '../lib/items'

type ActiveItem = { text?: string;[key: string]: any }

export const renderSelectPopup = (
  items: any,
  setValue: any,
  active: boolean
): VNodeTypes | undefined => {
  let content
  if (active) {
    let rowsOuter: VNode | undefined
    if (!items || !items.length) {
      rowsOuter = h('div', { style: 'padding: 0 0.5em' }, 'No items')
    } else {
      const rows = []
      for (const item of items) {
        if (item.special === 'header') {
          rows.push(h('div', { class: 'of-list-header' }, item.text))
        } else if (item.special === 'divider') {
          rows.push(h('div', { class: 'of-list-divider' }))
        } else {
          rows.push(
            h(
              OfListItem,
              {
                active: item.selected,
                disabled: item.disabled,
                onClick: () => {
                  setValue(item.value)
                },
              },
              () => item.text
            )
          )
        }
      }
      rowsOuter = h('div', { class: 'of-list-outer' }, rows)
    }
    content = h('div', { role: 'menu', class: 'of-menu' }, [
      h(OfNavGroup, () => rowsOuter),
    ])
  } else {
    content = undefined
  }
  return content
}

export const SelectField = defineFieldType({
  name: 'select',
  setup(props: FieldProps, ctx: FieldContext) {
    const itemMgr = useItems()
    const initialValue = computed(() => {
      let initial = ctx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })

    const searchText = ref()
    const inputValue = ref()
    const pendingValue = ref() // store selected but unconfirmed value
    const stateValue = ref()
    watch(
      () => ctx.value,
      (val) => {
        if (val === undefined || val === '') val = null
        inputValue.value = val
        stateValue.value = val
        pendingValue.value = undefined
      },
      {
        immediate: true,
      }
    )

    const elt = ref<HTMLElement | undefined>()
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
    const opened = ref(false)
    const items = computed(() => {
      const result = {
        disabledKey: 'disabled',
        items: [],
        specialKey: 'special',
        textKey: 'text',
        valueKey: 'value',
      }
      const list = itemMgr.getItemList(ctx.items || props.items)
      if (list) {
        Object.assign(result, list)
      }
      return result
    })
    const activeItem = computed(() => {
      const resolved = items.value
      const value = inputValue.value
      let cmpVal
      let found: { idx?: number; item?: ActiveItem } = {}
      let idx = 0
      for (const item of resolved.items) {
        if (typeof item === 'string') {
          cmpVal = item
        } else if (typeof item === 'object') {
          if (item[resolved.specialKey]) {
            idx++
            continue
          }
          cmpVal = (item as any)[resolved.valueKey]
        }
        if (cmpVal === '') cmpVal = null
        if (cmpVal === value) {
          if (typeof item === 'string') {
            found = { idx, item: { value: item, text: item } }
          } else {
            found = { idx, item }
          }
          break
        }
        idx++
      }
      return found
    })
    const formatItems = computed(() => {
      const active = activeItem.value
      const resolved = items.value
      const rows = []
      let idx = 0
      for (const item of resolved.items) {
        if (typeof item === 'string') {
          rows.push({
            disabled: false,
            text: item,
            selected: active.idx === idx,
            value: item,
          })
        } else if (typeof item === 'object') {
          rows.push({
            disabled: item[resolved.disabledKey],
            text: item[resolved.textKey],
            value: item[resolved.valueKey],
            selected: active.idx === idx,
            special: item[resolved.specialKey],
          })
        }
        idx++
      }
      return rows
    })

    const canOpen = computed(() => ctx.mode !== 'readonly' && !ctx.locked)
    let closing: number | null = null
    const clickOpen = (_evt?: MouseEvent) => {
      if (opened.value) {
        closePopup()
      } else if (canOpen.value && !closing) {
        opened.value = true
      }
      return false
    }
    const closePopup = (refocus?: boolean) => {
      if (opened.value) {
        opened.value = false
        if (closing) clearTimeout(closing)
        closing = setTimeout(() => {
          closing = null
        }, 150)
        if (refocus) focus()
      }
    }
    const focus = () => {
      const curelt = elt.value
      if (curelt) curelt.focus()
    }
    const setValue = (val: any) => {
      inputValue.value = val
      if (ctx.onUpdate) ctx.onUpdate(val)
      closePopup(true)
    }
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
        searchText.value = ''
      },
      onKeydown(evt: KeyboardEvent) {
        if (evt.key == ' ' || evt.key == 'ArrowUp' || evt.key == 'ArrowDown') {
          clickOpen()
          evt.preventDefault()
          evt.stopPropagation()
        } else if (formatItems.value.length && (/(^Key([A-Z]$))/.test(evt.code) || /(^Digit([0-9]$))/.test(evt.code))) {
          searchText.value += evt.key
          for (let i = 0; i < formatItems.value.length; i++) {
            const option = formatItems.value[i] 
            if (option.value !== undefined) {
              const optionText: string = option.text
              if (optionText.substring(0, searchText.value.length).toLowerCase() == searchText.value.toLowerCase() ) {
                setValue(option.value)
                return
              } 
            }
          }
        }
      },
      onVnodeMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLElement
      },
    }

    return fieldRender({
      append: () =>
        h(OfIcon, {
          class: 'of-select-icon',
          name: opened.value ? 'bullet-select-close' : 'bullet-select',
          size: 'input',
        }),
      blank: computed(() => {
        if (!activeItem.value.item) return true
        const val = inputValue.value
        return val === undefined || val === null || val === ''
      }),
      class: 'of-select-field',
      content: () => {
        const label = activeItem.value.item?.text || ''
        return [
          h(
            'div',
            {
              class: [
                'of-field-input-label',
                'of--align-' + (props.align || 'start'),
              ],
              id: inputId.value,
              tabindex: 0,
              ...hooks,
            },
            [label]
          ),
        ]
      },
      click: clickOpen,
      cursor: computed(() => (canOpen.value ? 'pointer' : null)),
      focus,
      focused: computed(() => focused.value || opened.value),
      // hovered,
      inputId,
      inputValue,
      // loading
      // messages
      pendingValue,
      popup: {
        content: () =>
          renderSelectPopup(formatItems.value, setValue, opened.value),
        visible: opened,
        onBlur: closePopup,
      },
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
    })
  },
})
