// Add any global mocks here
import 'react-native-gesture-handler/jestSetup';

jest.mock('expo-font', () => ({
    loadAsync: jest.fn(),
    isLoaded: jest.fn(() => true),
}));
