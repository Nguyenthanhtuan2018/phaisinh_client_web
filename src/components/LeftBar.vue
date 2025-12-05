<template>
  <div class="tv-leftbar">
    <!-- Init menu button -->
    <button class="lb-btn lb-sep" @click="toggleMenu" title="Khởi tạo">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M13 7a5 5 0 1 0 4 4l5-5-3-3-5 5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 14 6 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Validation button -->
    <button class="lb-btn lb-sep" @click="emit('showValidation')" title="Validation">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="12" cy="8" r="1.3" fill="currentColor"/>
        <path d="M11 11h2v6h-2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Start button -->
    <button class="lb-btn lb-sep" @click="emit('startPoint')" title="Start" :class="{ active: isSelectingStart }">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M4 4v16M6 4h11l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- End/Stop button -->
    <button class="lb-btn" @click="emit('stopPoint')" title="End" :class="{ active: isSelectingStop }">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="12" cy="11" r="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Auto SP button -->
    <button class="lb-btn" @click="toggleAutoSP" title="Auto SP" :class="{ active: autoSPEnabled }">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M8 5v14l11-7-11-7Z" fill="currentColor"/>
      </svg>
      <span v-if="autoSPEnabled" class="lb-badge">A</span>
    </button>

    <!-- Lock ABC button -->
    <button class="lb-btn lb-sep" @click="emit('lockABC')" title="Lock ABC" :class="{ active: isLocked }">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <rect x="4" y="10" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/>
      </svg>
    </button>

    <!-- Fullscreen button -->
    <button class="lb-btn" @click="toggleFullscreen" title="Fullscreen (F)">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Init Menu Popup -->
    <div v-if="showMenu" class="tv-menu" :style="menuStyle">
      <div class="mi" @click="handleImport">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span>Import</span>
      </div>
      <div class="mi" @click="emit('refresh')">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M23 4v6h-6M1 20v-6h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span>Refresh</span>
      </div>
      <div class="sep"></div>
      <div class="mi" @click="emit('reset')">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span>Reset</span>
      </div>
    </div>

    <!-- Hidden file input -->
    <input type="file" ref="fileInput" @change="onFileChange" accept=".json" multiple style="display: none" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const emit = defineEmits<{
  startPoint: [];
  stopPoint: [];
  lockABC: [];
  showValidation: [];
  refresh: [];
  reset: [];
  import: [files: FileList];
  autoSPChange: [enabled: boolean];
}>();

const props = defineProps<{
  isSelectingStart?: boolean;
  isSelectingStop?: boolean;
  isLocked?: boolean;
}>();

const showMenu = ref(false);
const autoSPEnabled = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const menuStyle = computed(() => ({
  top: '48px',
  left: '52px'
}));

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function toggleAutoSP() {
  autoSPEnabled.value = !autoSPEnabled.value;
  emit('autoSPChange', autoSPEnabled.value);
}

function handleImport() {
  showMenu.value = false;
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.length) {
    emit('import', target.files);
    target.value = '';
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// Close menu when clicking outside
function handleClickOutside(e: MouseEvent) {
  if (showMenu.value) {
    showMenu.value = false;
  }
}
</script>

<style scoped>
.tv-leftbar {
  position: fixed;
  top: 40px;
  left: 0;
  bottom: 0;
  width: 44px;
  background: #131722;
  border-right: 1px solid #2d2f36;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 6px;
  z-index: 10000;
}

.lb-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.lb-btn:hover {
  background: #0f0f0f;
  border-color: #2d2f36;
}

.lb-btn.active {
  background: #1e40af;
  border-color: #3b82f6;
}

.lb-sep {
  margin-bottom: 12px;
}

.lb-sep::after {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -7px;
  width: 22px;
  height: 1px;
  background: #2d2f36;
}

.lb-badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  font-size: 9px;
  padding: 0 4px;
  border-radius: 6px;
  background: #0ea5e9;
  color: #fff;
}

.tv-menu {
  position: fixed;
  min-width: 220px;
  background: #131722;
  color: #fff;
  border: 1px solid #2d2f36;
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  padding: 6px;
  z-index: 10001;
}

.mi {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.mi:hover {
  background: #0f0f0f;
}

.ic {
  width: 18px;
  height: 18px;
  display: inline-flex;
  color: #fff;
}

.sep {
  height: 1px;
  background: #2d2f36;
  margin: 6px 4px;
}
</style>
