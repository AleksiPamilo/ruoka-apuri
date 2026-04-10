import { View, Text, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7'
    },
    text: {
        fontSize: 18,
        fontWeight: '500',
        color: '#1C1C1E'
    }
})

export default function HomeScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Tervetuloa ruoka-apuriin!</Text>
        </View>
    )
}