// Get user's timezone information
export const getUserTimezone = () => {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: new Date().getTimezoneOffset(),
    offsetString: getOffsetString(new Date().getTimezoneOffset())
  };
};

// Convert minutes to UTC offset string (e.g., "-05:00")
const getOffsetString = (offset) => {
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? '+' : '-';
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Format date in user's timezone
export const formatDateInUserTimezone = (date, userTimezone) => {
  try {
    return new Date(date).toLocaleString('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    // Fallback to local timezone if user timezone is invalid
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
};
