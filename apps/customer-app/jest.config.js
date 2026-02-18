module.exports = {
    preset: 'react-native',
    rootDir: '.',
    setupFilesAfterEnv: ['./jest-setup.ts'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|expo-modules-core|expo-.*))',
    ],
};
