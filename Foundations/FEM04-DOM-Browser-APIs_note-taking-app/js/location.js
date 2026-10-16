const ERROR_MESSAGES = {
  1: 'Location permission was denied.',
  2: 'Your location is unavailable right now.',
  3: 'Getting your location timed out.',
};

const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(coords),
      (error) => reject(new Error(ERROR_MESSAGES[error.code])),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  });

// Reverse geocode with OpenStreetMap; an empty string means "show coordinates instead"
const lookupCity = async (latitude, longitude) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const { address = {} } = await res.json();
    return address.city || address.town || address.village || address.county || '';
  } catch {
    return '';
  }
};

export const getCurrentLocation = async () => {
  const { latitude, longitude } = await getPosition();
  const city = await lookupCity(latitude, longitude);
  return { latitude, longitude, city };
};
