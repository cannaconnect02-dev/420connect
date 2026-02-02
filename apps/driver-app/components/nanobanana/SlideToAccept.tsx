
import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { NanoTheme } from '../../constants/nanobanana';
import { ChevronRight } from 'lucide-react-native';

interface SlideToAcceptProps {
    onSlideComplete: () => void;
    label?: string;
}

const BUTTON_HEIGHT = 60;
const BUTTON_WIDTH = Dimensions.get('window').width - 48; // Padding 24 * 2
const SWIPE_LIMIT = BUTTON_WIDTH - BUTTON_HEIGHT - 10; // Padding inside

export default function SlideToAccept({ onSlideComplete, label = "SLIDE TO ACCEPT" }: SlideToAcceptProps) {
    const [completed, setCompleted] = useState(false);
    const pan = new Animated.ValueXY();

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            if (completed) return;
            if (gestureState.dx > 0 && gestureState.dx <= SWIPE_LIMIT) {
                pan.setValue({ x: gestureState.dx, y: 0 });
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (completed) return;
            if (gestureState.dx > SWIPE_LIMIT * 0.8) {
                // Success threshold met
                Animated.spring(pan, {
                    toValue: { x: SWIPE_LIMIT, y: 0 },
                    useNativeDriver: false,
                }).start(() => {
                    setCompleted(true);
                    onSlideComplete();
                });
            } else {
                // Reset
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false,
                }).start();
            }
        }
    });

    return (
        <View style={styles.container}>
            <View style={styles.track}>
                <Text style={styles.label}>{label}</Text>
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[pan.getLayout(), styles.thumb]}
                >
                    <ChevronRight size={32} color="black" />
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: BUTTON_HEIGHT,
        width: BUTTON_WIDTH,
        backgroundColor: NanoTheme.colors.primaryDim,
        borderRadius: NanoTheme.borderRadius.full,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: NanoTheme.colors.primary,
        justifyContent: 'center',
    },
    track: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        color: NanoTheme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 2,
    },
    thumb: {
        position: 'absolute',
        left: 4,
        top: 4, // Center vertically roughly
        width: BUTTON_HEIGHT - 8,
        height: BUTTON_HEIGHT - 8,
        borderRadius: NanoTheme.borderRadius.full,
        backgroundColor: NanoTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
