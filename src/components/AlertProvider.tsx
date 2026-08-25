import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextValue {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

let globalShowAlert: ((options: AlertOptions) => void) | null = null;

export function showAppAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  if (globalShowAlert) {
    globalShowAlert({ title, message, buttons });
  }
}

export function useAppAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setAlertConfig(options);
  };

  const hideAlert = () => {
    setAlertConfig(null);
  };

  globalShowAlert = showAlert;

  const rawButtons = alertConfig?.buttons && alertConfig.buttons.length > 0
    ? alertConfig.buttons
    : [{ text: 'OK', style: 'default' as const }];

  const isVertical = rawButtons.length > 2;

  let buttons = [...rawButtons];
  if (isVertical) {
    buttons.sort((a, b) => {
      if (a.style === 'cancel' && b.style !== 'cancel') return 1;
      if (a.style !== 'cancel' && b.style === 'cancel') return -1;
      if (a.style !== 'destructive' && b.style === 'destructive') return -1;
      if (a.style === 'destructive' && b.style !== 'destructive') return 1;
      return 0;
    });
  } else if (buttons.length === 2) {
    buttons.sort((a, b) => {
      if (a.style === 'cancel' && b.style !== 'cancel') return -1;
      if (a.style !== 'cancel' && b.style === 'cancel') return 1;
      return 0;
    });
  }

  const handleButtonPress = (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const handleBackdropPress = () => {
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      handleButtonPress(cancelBtn);
    } else if (buttons.length === 1) {
      handleButtonPress(buttons[0]);
    } else {
      hideAlert();
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal
        visible={alertConfig !== null}
        transparent
        animationType="fade"
        onRequestClose={handleBackdropPress}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
          <View
            style={[
              styles.dialogCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {alertConfig?.title ? (
              <Text style={[styles.dialogTitle, { color: colors.text }]}>{alertConfig.title}</Text>
            ) : null}
            {alertConfig?.message ? (
              <Text style={[styles.dialogMessage, { color: colors.mutedText }]}>
                {alertConfig.message}
              </Text>
            ) : null}

            <View
              style={[
                styles.buttonContainer,
                isVertical ? styles.buttonContainerVertical : styles.buttonContainerHorizontal,
              ]}
            >
              {buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';

                let btnBg = colors.primary;
                let btnTextColor = '#FFFFFF';
                let btnBorderColor = 'transparent';

                if (isCancel) {
                  btnBg = colors.background;
                  btnTextColor = colors.text;
                  btnBorderColor = colors.border;
                } else if (isDestructive) {
                  btnBg = '#DC2626';
                  btnTextColor = '#FFFFFF';
                }

                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.button,
                      !isVertical && styles.buttonFlex,
                      isVertical && isCancel && styles.verticalCancelButton,
                      {
                        backgroundColor: btnBg,
                        borderColor: btnBorderColor,
                        borderWidth: isCancel ? 1 : 0,
                      },
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { color: btnTextColor },
                        (isDestructive || !isCancel) && styles.boldButtonText,
                      ]}
                      numberOfLines={1}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  buttonContainer: {
    gap: 10,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalCancelButton: {
    marginTop: 4,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  boldButtonText: {
    fontWeight: '700',
  },
});
