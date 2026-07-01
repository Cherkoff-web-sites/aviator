const STORAGE_KEY = 'aviator_device_fp'

export function getDeviceFingerprint() {
  let fp = localStorage.getItem(STORAGE_KEY)
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, fp)
  }
  return fp
}
