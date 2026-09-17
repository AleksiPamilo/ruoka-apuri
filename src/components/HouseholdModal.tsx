import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/AppThemeProvider';
import { Household } from '../types/household';
import {
  createHousehold,
  getActiveHousehold,
  joinHousehold,
  leaveHousehold,
} from '../services/householdService';
import { showAppAlert } from './AlertProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  onHouseholdChanged?: () => void;
};

export default function HouseholdModal({ visible, onClose, onHouseholdChanged }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [household, setHousehold] = useState<Household | null>(null);
  const [viewState, setViewState] = useState<'overview' | 'create' | 'join'>('overview');
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCurrentHousehold();
      setViewState('overview');
      setErrorMessage(null);
      setNameInput('');
      setCodeInput('');
    }
  }, [visible]);

  const loadCurrentHousehold = async () => {
    const current = await getActiveHousehold();
    setHousehold(current);
  };

  const handleCreate = async () => {
    setLoading(true);
    setErrorMessage(null);
    const result = await createHousehold(nameInput.trim() || 'Oma talous');
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setHousehold(result.household);
    setViewState('overview');
    if (onHouseholdChanged) onHouseholdChanged();
  };

  const handleJoin = async () => {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage('Syötä koodi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const result = await joinHousehold(trimmed);
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setHousehold(result.household);
    setViewState('overview');
    if (onHouseholdChanged) onHouseholdChanged();
  };

  const handleLeave = () => {
    showAppAlert(
      'Lopeta jakaminen?',
      'Haluatko varmasti poistua jaetusta taloudesta? Sovelluksesi palaa takaisin yksityiseen tilaan.',
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Lopeta jakaminen',
          style: 'destructive',
          onPress: async () => {
            await leaveHousehold();
            setHousehold(null);
            setViewState('overview');
            if (onHouseholdChanged) onHouseholdChanged();
          },
        },
      ]
    );
  };

  const handleCopyCode = async () => {
    if (!household) return;
    await Clipboard.setStringAsync(household.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const handleShareCode = async () => {
    if (!household) return;
    try {
      await Share.share({
        message: `Liity jaettuun ruokatalouteeni Ruoka-apuri -sovelluksessa koodilla: ${household.code}`,
        title: 'Ruoka-apuri talouskoodi',
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalWrapper} pointerEvents="box-none">
          <View
            style={[
              styles.dialogCard,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 16) + 20,
                maxHeight: windowHeight * 0.85,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTitleGroup}>
                <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="people" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.title, { color: colors.text }]}>Jaettu talous</Text>
                  <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                    {household ? 'Reaaliaikainen jako käytössä' : 'Ei vaadi kirjautumista'}
                  </Text>
                </View>
              </View>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
                onPress={onClose}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={[styles.scroll, styles.scrollFlex]}>
              {household ? (
                <View style={styles.activeContainer}>
                  <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                    <Text style={[styles.codeLabel, { color: colors.mutedText }]}>TALOUSKOODI</Text>
                    <Pressable style={styles.codeRow} onPress={handleCopyCode} hitSlop={6}>
                      <Text style={[styles.codeText, { color: colors.primary }]}>{household.code}</Text>
                      <Ionicons
                        name={codeCopied ? 'checkmark-circle' : 'copy-outline'}
                        size={20}
                        color={codeCopied ? colors.success : colors.primary}
                      />
                    </Pressable>
                    <Text style={[styles.copiedHint, { color: colors.success, opacity: codeCopied ? 1 : 0 }]}>
                      Kopioitu leikepöydälle
                    </Text>
                    <Text style={[styles.householdName, { color: colors.text }]}>{household.name}</Text>
                  </View>

                  <Text style={[styles.infoText, { color: colors.mutedText }]}>
                    Ostoslista ja viikkosuunnitelma päivittyvät reaaliajassa kaikille laitteille, jotka käyttävät tätä koodia.
                  </Text>

                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleShareCode}
                  >
                    <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Jaa koodi kumppanille</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.dangerBtn, { backgroundColor: '#FF3B3015' }]}
                    onPress={handleLeave}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
                    <Text style={styles.dangerBtnText}>Lopeta jakaminen</Text>
                  </Pressable>
                </View>
              ) : viewState === 'overview' ? (
                <View style={styles.overviewContainer}>
                  <Text style={[styles.infoText, { color: colors.mutedText }]}>
                    Voit jakaa saman ostoslistan ja ateriasuunnitelman kumppanisi tai perheesi kanssa ilman sähköpostia tai salasanoja.
                  </Text>

                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setViewState('create')}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Luo uusi jaettu talous</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.secondaryBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setViewState('join')}
                  >
                    <Ionicons name="key-outline" size={20} color={colors.text} />
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Liity koodilla</Text>
                  </Pressable>
                </View>
              ) : viewState === 'create' ? (
                <View style={styles.formContainer}>
                  <Text style={[styles.formTitle, { color: colors.text }]}>Uusi jaettu talous</Text>
                  <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Talouden nimi (valinnainen)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="esim. Meidän perhe"
                    placeholderTextColor={colors.mutedText}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus={true}
                  />

                  {errorMessage ? (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setViewState('overview');
                        setErrorMessage(null);
                      }}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Takaisin</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleCreate}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Luo koodi</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.formContainer}>
                  <Text style={[styles.formTitle, { color: colors.text }]}>Liity jaettuun talouteen</Text>
                  <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Syötä talouskoodi</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.codeInputStyle,
                      { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder="esim. KOKKI-842"
                    placeholderTextColor={colors.mutedText}
                    value={codeInput}
                    onChangeText={setCodeInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus={true}
                  />

                  {errorMessage ? (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setViewState('overview');
                        setErrorMessage(null);
                      }}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Takaisin</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleJoin}
                      disabled={loading || !codeInput.trim()}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Liity</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalWrapper: {
    width: '100%',
  },
  dialogCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    marginTop: 4,
  },
  scrollFlex: {
    flexShrink: 1,
  },
  overviewContainer: {
    gap: 14,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginVertical: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeContainer: {
    gap: 14,
    paddingVertical: 8,
    alignItems: 'stretch',
  },
  codeBox: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  copiedHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  householdName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
  },
  dangerBtnText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  codeInputStyle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
});
