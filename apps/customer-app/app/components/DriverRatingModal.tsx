import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface DriverRatingModalProps {
    visible: boolean;
    onClose: () => void;
    orderId: string;
    orderTotal: number;
    onRatingSubmitted: () => void;
}

const TIP_OPTIONS = [
    { label: 'No Tip', value: 0 },
    { label: '10%', value: 0.10 },
    { label: '15%', value: 0.15 },
    { label: '20%', value: 0.20 },
];

export default function DriverRatingModal({
    visible,
    onClose,
    orderId,
    orderTotal,
    onRatingSubmitted,
}: DriverRatingModalProps) {
    const [rating, setRating] = useState(0);
    const [selectedTip, setSelectedTip] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const tipAmount = orderTotal * selectedTip;

    const handleSubmit = async () => {
        if (rating === 0) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    driver_rating: rating,
                    driver_tip: tipAmount,
                    rated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            if (error) throw error;

            onRatingSubmitted();
            onClose();
            // Reset state
            setRating(0);
            setSelectedTip(0);
        } catch (e) {
            console.error('Failed to submit rating:', e);
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        style={styles.starButton}
                    >
                        {/* @ts-ignore */}
                        <Star
                            size={40}
                            color={star <= rating ? '#fbbf24' : '#475569'}
                            fill={star <= rating ? '#fbbf24' : 'transparent'}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Rate Your Driver</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            {/* @ts-ignore */}
                            <X size={24} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Star Rating */}
                    <Text style={styles.label}>How was your delivery?</Text>
                    {renderStars()}

                    {/* Tip Selection */}
                    <Text style={styles.label}>Add a tip for your driver</Text>
                    <View style={styles.tipContainer}>
                        {TIP_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.label}
                                style={[
                                    styles.tipButton,
                                    selectedTip === option.value && styles.tipButtonActive,
                                ]}
                                onPress={() => setSelectedTip(option.value)}
                            >
                                <Text
                                    style={[
                                        styles.tipButtonText,
                                        selectedTip === option.value && styles.tipButtonTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Tip Amount Display */}
                    {selectedTip > 0 && (
                        <View style={styles.tipAmountContainer}>
                            <Text style={styles.tipAmountLabel}>Tip Amount:</Text>
                            <Text style={styles.tipAmountValue}>R{tipAmount.toFixed(2)}</Text>
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={rating === 0 || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitBtnText}>
                                Submit Rating{selectedTip > 0 ? ` & R${tipAmount.toFixed(2)} Tip` : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    closeBtn: {
        padding: 4,
    },
    label: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 12,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    starButton: {
        padding: 4,
    },
    tipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    tipButton: {
        flex: 1,
        minWidth: '22%',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    tipButtonActive: {
        backgroundColor: '#10b981',
    },
    tipButtonText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 14,
    },
    tipButtonTextActive: {
        color: 'white',
    },
    tipAmountContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#0f172a',
        borderRadius: 12,
    },
    tipAmountLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    tipAmountValue: {
        color: '#10b981',
        fontSize: 18,
        fontWeight: 'bold',
    },
    submitBtn: {
        backgroundColor: '#10b981',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitBtnDisabled: {
        backgroundColor: '#475569',
    },
    submitBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
