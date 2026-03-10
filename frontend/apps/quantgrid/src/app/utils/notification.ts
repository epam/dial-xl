export const requestWebNotificationsPermissions =
  (): Promise<NotificationPermission> => {
    if (Notification.permission === 'default') {
      return Notification.requestPermission();
    }

    return new Promise((resolve) => resolve(Notification.permission));
  };

export const webNotify = async (
  title: string,
  options: NotificationOptions,
): Promise<Notification | undefined> => {
  const permission = await requestWebNotificationsPermissions();

  if (permission === 'granted') {
    const notification = new Notification(title, {
      icon: options.icon ?? 'logo/192-192.png',
      ...options,
    });
    notification.onclick = function () {
      window.focus();
    };

    return notification;
  }

  return undefined;
};
