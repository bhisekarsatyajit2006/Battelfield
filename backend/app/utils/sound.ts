export const playAlertSound = () => {
  const audio = new Audio("/alert.mp3");
  audio.play();
};