import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 480,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.modalCard, { maxWidth }]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTextCol}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>

              {/* Footer */}
              {footer && <View style={styles.footer}>{footer}</View>}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  headerTextCol: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    maxHeight: 460,
  },
  bodyContent: {
    padding: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
    backgroundColor: '#1E293B80',
  },
});
