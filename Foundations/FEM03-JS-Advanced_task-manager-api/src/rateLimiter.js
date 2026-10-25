export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createRateLimiter = ({ interval = 100 } = {}) => {
  let nextSlot = 0;

  return (task) => {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + interval;
    return delay(wait).then(task);
  };
};
