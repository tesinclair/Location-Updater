import React, { useState, useRef } from "react";
import { View, Image, StyleSheet, TouchableOpacity, Text, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { NativeModules } from "react-native";
import LeafletMapWebView from "@/components/LeafletMapWebView";

const { ExifModule } = NativeModules;

export default function App() {
    const [image, setImage] = useState(null);
    const [location, setLocation] = useState(null);
    const [selectedCoordinates, setSelectedCoordinates] = useState(null);
    const mapRef = useRef(null);
    
    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({});
        if (!res.canceled) setImage(res.assets[0]);
    };
    
    const getLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "Location permission is required");
            return;
        }
        
        const loc = await Location.getCurrentPositionAsync({});
        const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
        };
        
        setLocation(coords);
        
        // Send location to map
        if (mapRef.current) {
            mapRef.current.setLocation(coords.latitude, coords.longitude, 16);
        }
        
    };
    
    const saveWithGps = async () => {
        if (!image) {
            Alert.alert("No Image", "Please select an image first");
            return;
        }
        
        let coordsToUse = location;
        
        // If user tapped on map, ask which coordinates to use
        if (selectedCoordinates && location) {
            Alert.alert(
                "Choose Coordinates",
                "Which coordinates would you like to use?",
                [
                    {
                        text: "GPS Location",
                        onPress: () => saveImageWithCoords(location)
                    },
                    {
                        text: "Map Selection",
                        onPress: () => saveImageWithCoords(selectedCoordinates)
                    },
                    { text: "Cancel", style: "cancel" }
                ]
            );
            return;
        }
        
        if (selectedCoordinates) {
            coordsToUse = selectedCoordinates;
        }
        
        if (!coordsToUse) {
            Alert.alert("No Location", "Please get your location or tap on the map first");
            return;
        }
        
        saveImageWithCoords(coordsToUse);
    };
    
    const saveImageWithCoords = async (coords) => {
        try {
            const newPath = await ExifModule.writeGpsToImage(
                image.uri.replace("file://", ""),
                coords.latitude,
                coords.longitude
            );
            console.log("Saved new image at:", newPath);
            Alert.alert(
                "Success", 
                `Image saved with GPS coordinates:\nLat: ${coords.latitude.toFixed(6)}\nLng: ${coords.longitude.toFixed(6)}`
            );
        } catch (error) {
            Alert.alert("Error", "Failed to save image with GPS data");
            console.error(error);
        }
    };
    
    // Handle map tap - when user taps on map
    const handleMapTap = (coordinates) => {
        setSelectedCoordinates(coordinates);
    };
    
    // Handle location set confirmation
    const handleLocationSet = (coordinates) => {
        console.log("Location set on map:", coordinates);
    };
    


    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.btn} onPress={pickImage}>
                <Text style={styles.btnText}>Pick Image</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btn} onPress={getLocation}>
                <Text style={styles.btnText}>Get My Location</Text>
            </TouchableOpacity>
            

            
            <TouchableOpacity style={styles.btn} onPress={saveWithGps}>
                <Text style={styles.btnText}>Save Image with GPS</Text>
            </TouchableOpacity>
            

            
            {image && <Image source={{ uri: image.uri }} style={styles.imagePreview} />}
            
            <LeafletMapWebView 
                ref={mapRef}
                onMapTap={handleMapTap}
                onLocationSet={handleLocationSet}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 40,
        padding: 20,
        backgroundColor: 'rgb(20, 20, 20)',
        gap: 15
    },
    
    btn: {
        backgroundColor: 'rgb(0, 0, 120)',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },

    
    imagePreview: {
        width: 200, 
        height: 200,
        borderRadius: 10,
        marginTop: 20,
        alignSelf: 'center',
    },
});
