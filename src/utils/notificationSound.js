const playNotificationSound = () => {
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed (interaction needed first):', e));
    } catch (error) {
        console.error('Error playing sound:', error);
    }
};

export default playNotificationSound;
