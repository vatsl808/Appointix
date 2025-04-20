/**
 * Checks if a given date and time falls within a doctor's weekly availability schedule.
 *
 * @param {object} availabilitySchedule - The doctor's schedule object (e.g., { Monday: { startTime: 'HH:MM', endTime: 'HH:MM', isAvailable: boolean }, ... }).
 * @param {string|Date} selectedDate - The date of the potential appointment.
 * @param {string} selectedTime - The time of the potential appointment ('HH:MM').
 * @returns {boolean} - True if the time slot is available, false otherwise.
 */
export function isTimeSlotAvailable(availabilitySchedule, selectedDate, selectedTime) {
  if (!availabilitySchedule || !selectedDate || !selectedTime) {
    console.warn("Availability check missing required parameters.");
    return false; // Cannot determine availability without all info
  }

  try {
    const dateObj = new Date(selectedDate);
    // Adjust for potential timezone issues if needed, getDay() is local timezone based
    const dayIndex = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Map getDay() index to our schedule keys
    const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = daysMap[dayIndex];

    const daySchedule = availabilitySchedule[dayOfWeek];

    if (!daySchedule || !daySchedule.isAvailable) {
      // console.log(`Doctor unavailable on ${dayOfWeek}`);
      return false; // Doctor is not available on this day
    }

    // Compare times (simple string comparison works for HH:MM format)
    if (selectedTime >= daySchedule.startTime && selectedTime < daySchedule.endTime) {
      // console.log(`Time slot ${selectedTime} on ${dayOfWeek} is available.`);
      return true; // Time slot is within the available range
    } else {
      // console.log(`Time slot ${selectedTime} is outside available range ${daySchedule.startTime}-${daySchedule.endTime} on ${dayOfWeek}`);
      return false; // Time slot is outside the available range
    }
  } catch (error) {
    console.error("Error checking availability:", error);
    return false; // Return false in case of errors
  }
}

// Example Usage:
// const schedule = {
//   Monday: { startTime: "09:00", endTime: "17:00", isAvailable: true },
//   // ... other days
// };
// console.log(isTimeSlotAvailable(schedule, '2025-04-14', '10:00')); // true (Assuming 2025-04-14 is a Monday)
// console.log(isTimeSlotAvailable(schedule, '2025-04-14', '18:00')); // false
// console.log(isTimeSlotAvailable(schedule, '2025-04-13', '10:00')); // false (Assuming 2025-04-13 is a Sunday and Sunday is unavailable)


/**
 * Formats the doctor's availability schedule into a concise summary string.
 * Groups consecutive days with the same available time slots.
 * Example: "Mon-Fri: 09:00-17:00, Sat: 10:00-12:00"
 *
 * @param {object} availabilitySchedule - The doctor's schedule object.
 * @returns {string} - A formatted summary string, or "Availability not set" if schedule is empty/invalid.
 */
export function formatAvailabilitySummary(availabilitySchedule) {
  if (!availabilitySchedule || typeof availabilitySchedule !== 'object' || Object.keys(availabilitySchedule).length === 0) {
    return "Availability not set";
  }

  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const summaryParts = [];
  let startDay = null;
  let currentSlot = null;

  const formatTime = (time) => time || ''; // Handle null/empty times gracefully

  for (let i = 0; i < daysOrder.length; i++) {
    const day = daysOrder[i];
    const schedule = availabilitySchedule[day];
    const slotKey = schedule && schedule.isAvailable ? `${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}` : null;

    if (slotKey) { // If the doctor is available on this day
      if (startDay === null) { // Start of a new group
        startDay = day;
        currentSlot = slotKey;
      } else if (slotKey !== currentSlot) { // Slot changed, end previous group
        const endDay = daysOrder[i - 1];
        const timeRange = currentSlot.split('-');
        summaryParts.push(`${startDay === endDay ? startDay.substring(0, 3) : `${startDay.substring(0, 3)}-${endDay.substring(0, 3)}`}: ${timeRange[0]}-${timeRange[1]}`);
        startDay = day; // Start new group
        currentSlot = slotKey;
      }
      // If slotKey is the same as currentSlot, continue the group
    } else { // Doctor is not available, end any current group
      if (startDay !== null) {
        const endDay = daysOrder[i - 1];
        const timeRange = currentSlot.split('-');
        summaryParts.push(`${startDay === endDay ? startDay.substring(0, 3) : `${startDay.substring(0, 3)}-${endDay.substring(0, 3)}`}: ${timeRange[0]}-${timeRange[1]}`);
        startDay = null;
        currentSlot = null;
      }
    }
  }

  // Handle the last group if it extends to Sunday
  if (startDay !== null) {
    const endDay = daysOrder[daysOrder.length - 1];
     const timeRange = currentSlot.split('-');
    summaryParts.push(`${startDay === endDay ? startDay.substring(0, 3) : `${startDay.substring(0, 3)}-${endDay.substring(0, 3)}`}: ${timeRange[0]}-${timeRange[1]}`);
  }

  return summaryParts.length > 0 ? summaryParts.join(', ') : "Not available";
}
