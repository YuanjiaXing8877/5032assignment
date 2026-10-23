<script setup>
import { computed, nextTick, ref } from 'vue'
import BookingControl from './BookingControl.vue'
import { calendarDateLabel, calendarKeyDate, calendarMonthLabel, fallsOnDate, melbourneDateKey, monthDays, shiftMonth } from '../utils/calendar'
import { activityStatus, formatActivityTime } from '../services/activities'
const props = defineProps({ activities: { type: Array, required: true }, bookings: { type: Object, required: true }, now: { type: Number, required: true }, busy: { type: String, default: '' } })
const emit = defineEmits(['booking'])
const selected = ref(melbourneDateKey(props.now))
const mineOnly = ref(false)
const calendar = ref(null)
const today = computed(() => melbourneDateKey(props.now))
const days = computed(() => monthDays(selected.value))
const events = computed(() => props.activities.filter(activity => mineOnly.value ? props.bookings[activity.id]?.status === 'Booked' : activity.status === 'Published' || props.bookings[activity.id]?.status === 'Booked'))
const byDate = computed(() => Object.fromEntries(days.value.map(key => [key, events.value.filter(activity => fallsOnDate(activity, key))])))
const agenda = computed(() => (byDate.value[selected.value] || []).slice().sort((a, b) => a.startAt - b.startAt || a.title.localeCompare(b.title)))
const bookedCount = key => byDate.value[key].filter(activity => props.bookings[activity.id]?.status === 'Booked').length
function dayLabel(key) { return `${calendarDateLabel(key)}. ${bookedCount(key)} booked.${key === today.value ? ' Today.' : ''}` }
async function choose(key, focus = false) {
  selected.value = key
  if (focus) { await nextTick(); calendar.value?.querySelector(`[data-date="${key}"]`)?.focus({ preventScroll: true }) }
}
function keydown(event, key) {
  const next = calendarKeyDate(event.key, key, event.shiftKey)
  if (next) { event.preventDefault(); choose(next, true) }
}
</script>
<template>
  <section id="activity-calendar" class="activity-calendar" aria-labelledby="calendar-title">
    <div class="calendar-heading"><div><h3 id="calendar-title">Activity calendar</h3><p>Plan your bookings. All dates and times use Melbourne time.</p></div><label class="calendar-filter"><input v-model="mineOnly" type="checkbox" /> Show my bookings only</label></div>
    <div class="calendar-layout">
      <div ref="calendar" class="calendar-month">
        <div class="month-controls"><button type="button" class="calendar-button" aria-label="Previous month" @click="choose(shiftMonth(selected, -1))"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m10 3-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2" /></svg></button><h4 aria-live="polite" aria-atomic="true">{{ calendarMonthLabel(selected) }}</h4><button type="button" class="calendar-button" aria-label="Next month" @click="choose(shiftMonth(selected, 1))"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" /></svg></button><button type="button" class="calendar-button today-button" @click="choose(today)">Today</button></div>
        <div class="weekdays" aria-hidden="true"><span v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="day">{{ day }}</span></div>
        <div class="calendar-grid" role="group" :aria-label="`${calendarMonthLabel(selected)} activity dates`" aria-describedby="calendar-keyboard-help">
          <button v-for="day in days" :key="day" :data-date="day" type="button" class="calendar-day" :class="{ outside: day.slice(0, 7) !== selected.slice(0, 7), today: day === today, selected: day === selected, 'has-booking': bookedCount(day) }" :tabindex="day === selected ? 0 : -1" :aria-pressed="day === selected" :aria-current="day === today ? 'date' : undefined" @click="choose(day)" @keydown="keydown($event, day)">
            <span class="day-number">{{ Number(day.slice(8)) }}<svg v-if="bookedCount(day)" class="booking-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" /></svg></span><small>{{ byDate[day].length }}<span class="sr-only"> {{ byDate[day].length === 1 ? 'activity.' : 'activities.' }}</span></small><span class="sr-only"> {{ dayLabel(day) }}</span>
          </button>
        </div>
        <p class="calendar-legend">Numbers below dates show activity counts. ✓ marks your bookings.</p><p id="calendar-keyboard-help" class="sr-only">Use arrow keys to move by day or week. Home and End move within the week. Page Up and Page Down change month; hold Shift to change year.</p>
      </div>
      <div class="calendar-agenda"><h4>{{ calendarDateLabel(selected) }}</h4><p class="agenda-count" role="status" aria-live="polite">{{ agenda.length }} {{ mineOnly ? 'booked' : '' }} {{ agenda.length === 1 ? 'activity' : 'activities' }} on this date.</p>
        <p v-if="!agenda.length" class="calendar-empty">{{ mineOnly ? 'No bookings on this date. Clear the filter to browse all activities.' : 'No activities on this date. Choose a date with an activity count.' }}</p>
        <ul v-else class="agenda-list" tabindex="0" :aria-label="`Activities on ${calendarDateLabel(selected)}`"><li v-for="activity in agenda" :key="activity.id"><div class="agenda-title"><strong>{{ activity.title }}</strong><span class="role-badge">{{ bookings[activity.id]?.status === 'Booked' ? 'Your booking' : activityStatus(activity, now) }}</span></div><p>{{ formatActivityTime(activity.startAt) }} – {{ formatActivityTime(activity.endAt) }}</p><p>{{ activity.address }}</p><p>{{ Math.max(0, activity.capacity - activity.bookedCount) }} places available</p><p v-if="activity.status === 'Cancelled'" class="field-error">Activity cancelled</p><BookingControl :activity="activity" :activities="activities" :bookings="bookings" :now="now" :busy="busy" prefix="calendar-booking" @change="emit('booking', $event)" /></li></ul>
      </div>
    </div>
  </section>
</template>
<style scoped>
.activity-calendar { margin: 22px 0 28px; padding: 18px; border: 1px solid var(--line); border-radius: 5px; background: #f7f8f6; }
.calendar-heading { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
h3 { font-size: 20px; margin: 0 0 6px; } h4 { font-size: 15px; margin: 0; color: var(--accent-strong); }
.calendar-heading p, .calendar-legend, .agenda-count, .calendar-empty { color: var(--muted); font-size: 12px; margin: 0; }
.calendar-filter { display: flex; align-items: center; gap: 7px; font-size: 12px; }
.calendar-filter input { accent-color: var(--accent); width: 17px; height: 17px; }
.calendar-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; }
.calendar-month, .calendar-agenda { min-width: 0; }
.month-controls { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.month-controls h4 { flex: 1; text-align: center; }
.calendar-button { border: 1px solid var(--control-border); border-radius: 4px; color: var(--accent); background: white; padding: 6px 10px; min-height: 36px; }
.calendar-button svg { display: block; width: 12px; height: 12px; }
.today-button { font-size: 12px; }
.weekdays, .calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
.weekdays { color: var(--muted); text-align: center; font-size: 10px; margin-bottom: 5px; }
.calendar-day { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 53px; min-width: 0; padding: 5px 1px; border: 1px solid var(--line); border-radius: 3px; background: white; color: var(--accent-strong); font-size: 13px; }
.calendar-day small { font-size: 10px; color: var(--muted); }
.calendar-day.outside { background: #f0efeb; color: var(--muted); }
.calendar-day.today .day-number { text-decoration: underline; text-underline-offset: 3px; font-weight: 750; }
.calendar-day.has-booking { border-color: var(--accent); }
.calendar-day.selected { color: white; background: var(--accent); border-color: var(--accent); }
.calendar-day.selected small { color: white; }
.booking-mark { width: 10px; height: 10px; margin-left: 1px; }
.calendar-legend { margin-top: 10px; }
.agenda-count { margin: 7px 0 12px; }
.agenda-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; max-height: 440px; overflow-y: auto; }
.agenda-list li { padding: 12px; background: white; border: 1px solid var(--line); border-radius: 4px; }
.agenda-title { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 14px; }
.agenda-title .role-badge { font-size: 10px; }
.agenda-list p { margin: 7px 0; font-size: 12px; }
@media (max-width: 767px) { .calendar-layout { grid-template-columns: minmax(0, 1fr); } .activity-calendar { padding: 12px; } .agenda-list { max-height: none; } }
@media (forced-colors: active) { .calendar-day.selected { outline: 2px solid Highlight; } }
</style>
