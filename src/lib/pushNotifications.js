import { supabase } from './supabase'
import { ENV } from './constants'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushPermissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function subscribeToPush(userId) {
  if (!(await isPushSupported())) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  if (!ENV.push.vapidPublicKey) {
    throw new Error('VITE_VAPID_PUBLIC_KEY is missing. Configure it to enable real push notifications.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(ENV.push.vapidPublicKey),
  })

  const { error } = await supabase
    .from('profiles')
    .update({ push_subscription: subscription.toJSON() })
    .eq('id', userId)

  if (error) throw error

  return subscription
}

export async function unsubscribeFromPush(userId) {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await subscription.unsubscribe()
  }

  const { error } = await supabase
    .from('profiles')
    .update({ push_subscription: null })
    .eq('id', userId)

  if (error) throw error
}
