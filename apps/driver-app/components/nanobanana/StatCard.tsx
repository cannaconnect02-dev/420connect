
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NanoTheme } from '../../constants/nanobanana';

interface StatCardProps {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

export default function StatCard({ label, value, icon }: StatCardProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: NanoTheme.colors.backgroundAlt,
        borderRadius: NanoTheme.borderRadius.md,
        padding: NanoTheme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: NanoTheme.colors.border,
        minWidth: 100,
        flex: 1,
    },
    value: {
        color: NanoTheme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    label: {
        color: NanoTheme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    }
});
