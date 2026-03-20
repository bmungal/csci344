import React, { useState } from "react";
import { View, Button, StyleSheet, Text, Alert } from "react-native";
import { callService, pingHA } from "./lib/ha";

const TOPIC = "led/control"; // make sure Pi B subscribes to this exact topic

export default function LightControlScreen({ route }) {
  const [busy, setBusy] = useState(false);
  const preset = route.params?.preset;

  // LightControlScreen.js
  const checkHA = async () => {
    try {
      setBusy(true);
      console.log("[UI] Check HA clicked");
      const r = await pingHA();
      console.log("[UI] Check HA result", r);
      Alert.alert("HA Ping", `ok=${r.ok} status=${r.status}\n${r.body}`);
    } catch (e) {
      console.log("[UI] Check HA error", e);
      Alert.alert("HA Ping Error", e?.message ?? "Unknown");
    } finally {
      setBusy(false);
    }
  };

  const sendToHA = async (payload) => {
    try {
      setBusy(true);
      await callService("mqtt", "publish", {
        topic: TOPIC,
        payload, // "ON" | "OFF" | "BLUE" | "#4A90E2" etc.
        qos: 1,
        retain: true,
      });
      Alert.alert("Sent to HA", String(payload));
    } catch (e) {
      Alert.alert("HA Error", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const chooseColor = (value) => sendToHA(value); // send a plain string

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Light Control {preset ? `(${preset})` : ""}
      </Text>

      <Button title="Check HA" onPress={checkHA} disabled={busy} />

      <Button title="Turn ON" onPress={() => sendToHA("ON")} disabled={busy} />
      <Button
        title="Turn OFF"
        onPress={() => sendToHA("OFF")}
        disabled={busy}
      />

      {/* color names OR hex; must match what Pi-B expects */}
      <Button
        title="Blue"
        onPress={() => chooseColor("BLUE")}
        disabled={busy}
      />
      <Button
        title="Purple"
        onPress={() => chooseColor("PURPLE")}
        disabled={busy}
      />
      <Button title="Red" onPress={() => chooseColor("RED")} disabled={busy} />
      <Button
        title="Warm White"
        onPress={() => chooseColor("WARM_WHITE")}
        disabled={busy}
      />
      {/* If Pi-B wants hex instead, use "#4A90E2" etc */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, padding: 20, justifyContent: "center" },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
});
