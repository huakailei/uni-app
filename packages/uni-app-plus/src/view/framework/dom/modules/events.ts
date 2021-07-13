import { withModifiers } from 'vue'
import { normalizeNativeEvent } from '@dcloudio/uni-core'
import {
  parseEventName,
  decodeEvent,
  formatLog,
  EventModifierFlags,
  normalizeEventType,
} from '@dcloudio/uni-shared'
import { VD_SYNC } from '../../../../constants'
import { ACTION_TYPE_EVENT } from '../../../../PageAction'
import { UniCustomElement } from '../components'

export function patchEvent(el: UniCustomElement, name: string, flag: number) {
  const [type, options] = parseEventName(decodeEvent(name))
  if (flag === -1) {
    // remove
    const listener = el.__listeners[type]
    if (listener) {
      el.removeEventListener(type, listener)
    } else if (__DEV__) {
      console.error(
        formatLog(`tag`, el.tagName, el.__id, 'event[' + type + '] not found')
      )
    }
  } else {
    // add
    if (el.__listeners[type]) {
      if (__DEV__) {
        console.error(
          formatLog(
            `tag`,
            el.tagName,
            el.__id,
            'event[' + type + '] already registered'
          )
        )
      }
      return
    }
    el.__listeners[type] = createInvoker(el.__id, flag, options)
    el.addEventListener(type, el.__listeners[type], options)
  }
}

export function createInvoker(
  id: number,
  flag: number,
  options?: AddEventListenerOptions
) {
  const invoker = (evt: Event) => {
    const event = normalizeNativeEvent(evt)
    ;(event as any).type = normalizeEventType(evt.type, options)
    UniViewJSBridge.publishHandler(VD_SYNC, [[ACTION_TYPE_EVENT, id, event]])
  }
  if (!flag) {
    return invoker
  }
  return withModifiers(invoker, resolveModifier(flag))
}

function resolveModifier(flag: number) {
  const modifiers: string[] = []
  if (flag & EventModifierFlags.prevent) {
    modifiers.push('prevent')
  }
  if (flag & EventModifierFlags.self) {
    modifiers.push('self')
  }
  if (flag & EventModifierFlags.stop) {
    modifiers.push('stop')
  }
  return modifiers
}
