import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useState } from "react"
import {
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native"

import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import useOurTeam from "../../src/features/team/hooks/useOurTeam"

function resolveEmployeeId(user) {
  const candidate = user?.Emp_Id || user?.EmployeeId || user?.UserId || user?.id
  const numeric = Number(candidate)
  return Number.isFinite(numeric) ? numeric : null
}

function getInitials(name) {
  if (!name || typeof name !== "string") {
    return "TM"
  }

  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "TM"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
}

function buildImageUri(base64Image) {
  if (!base64Image || typeof base64Image !== "string") {
    return null
  }

  const trimmed = base64Image.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith("data:image")) {
    return trimmed
  }

  return `data:image/jpeg;base64,${trimmed}`
}

function InfoChip({ icon, label, value }) {
  if (!value) {
    return null
  }

  return (
    <View style={styles.infoChip}>
      <Ionicons name={icon} size={14} color="#385773" />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

export default function OurTeamScreen() {
  const user = useAuthStore((state) => state.user)
  const employeeId = resolveEmployeeId(user)
  const ourTeamQuery = useOurTeam(employeeId)
  const [failedImages, setFailedImages] = useState({})
  const team = ourTeamQuery.data || []

  const handleOpenPhone = async (phone) => {
    if (!phone) {
      return
    }

    const url = `tel:${phone}`
    try {
      await Linking.openURL(url)
    } catch {
      // Ignore platform-level dialer errors.
    }
  }

  const handleOpenMail = async (email) => {
    if (!email) {
      return
    }

    const url = `mailto:${email}`
    try {
      await Linking.openURL(url)
    } catch {
      // Ignore platform-level mail app errors.
    }
  }

  if (!employeeId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>Employee ID not found in session.</Text>
      </View>
    )
  }

  if (ourTeamQuery.isLoading) {
    return <Loader />
  }

  if (ourTeamQuery.isError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>
          Unable to load team details right now.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#2B4F74", "#3C6E96", "#5A8DB7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>Our Team</Text>
        <Text style={styles.heroTitle}>{team.length} Members</Text>
      </LinearGradient>

      {team.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>No team members found.</Text>
        </View>
      ) : (
        <FlatList
          data={team}
          keyExtractor={(item, index) =>
            `${item.Emp_Code || "code"}-${item.EmailOfficial || "email"}-${index}`
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const imageUri = buildImageUri(item.Emp_Img)
            const showImage = Boolean(imageUri) && !failedImages[item.Emp_Code]

            return (
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  {showImage ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.avatarImage}
                      onError={() =>
                        setFailedImages((previous) => ({
                          ...previous,
                          [item.Emp_Code]: true,
                        }))
                      }
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitials}>
                        {getInitials(item.Emp_Name)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.nameBlock}>
                    <Text style={styles.nameText}>{item.Emp_Name || "-"}</Text>
                    <Text style={styles.codeText}>{item.Emp_Code || "-"}</Text>
                    {item.Des_Name ? (
                      <Text style={styles.designationText}>
                        {item.Des_Name}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <InfoChip
                    icon="business-outline"
                    label="Company"
                    value={item.Comp_Name}
                  />
                  <InfoChip
                    icon="location-outline"
                    label="Branch"
                    value={item.Branch_Name}
                  />
                  <InfoChip
                    icon="git-branch-outline"
                    label="Department"
                    value={item.Dep_Name}
                  />
                  <InfoChip
                    icon="layers-outline"
                    label="Sub Dept"
                    value={item.SubDep_Name}
                  />
                  <InfoChip
                    icon="briefcase-outline"
                    label="Category"
                    value={item.Category}
                  />
                  <InfoChip
                    icon="water-outline"
                    label="Blood Group"
                    value={item.Blood}
                  />
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() =>
                      handleOpenPhone(item.Mobile || item.MobileOff)
                    }
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed ? styles.actionPressed : null,
                    ]}
                    disabled={!item.Mobile && !item.MobileOff}
                  >
                    <Ionicons name="call-outline" size={16} color="#1E4A75" />
                    <Text style={styles.actionText}>
                      {item.Mobile || item.MobileOff || "No phone"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      handleOpenMail(item.EmailOfficial || item.EmailPersonal)
                    }
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed ? styles.actionPressed : null,
                    ]}
                    disabled={!item.EmailOfficial && !item.EmailPersonal}
                  >
                    <Ionicons name="mail-outline" size={16} color="#1E4A75" />
                    <Text style={styles.actionText} numberOfLines={1}>
                      {item.EmailOfficial || item.EmailPersonal || "No email"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E7EDF4",
  },
  hero: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  heroEyebrow: {
    color: "#DDEAF6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  heroTitle: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  listContent: {
    padding: 14,
    gap: 10,
    paddingBottom: 26,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6DFEA",
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    gap: 10,
  },
  avatarImage: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: "#D2DCE8",
  },
  avatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: "#DCEAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#2D5C88",
    fontSize: 20,
    fontWeight: "800",
  },
  nameBlock: {
    flex: 1,
    justifyContent: "center",
    gap: 1,
  },
  nameText: {
    color: "#1C3148",
    fontSize: 17,
    fontWeight: "800",
  },
  codeText: {
    color: "#3A5E80",
    fontSize: 12,
    fontWeight: "700",
  },
  designationText: {
    color: "#5D7287",
    fontSize: 12,
    fontWeight: "600",
  },
  metaGrid: {
    gap: 7,
  },
  infoChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E8F0",
    backgroundColor: "#F8FBFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    color: "#5E7186",
    fontSize: 11,
    fontWeight: "700",
  },
  infoValue: {
    color: "#263E58",
    fontSize: 13,
    fontWeight: "700",
  },
  actionRow: {
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D3DFEC",
    backgroundColor: "#EEF5FD",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionText: {
    flex: 1,
    color: "#24496A",
    fontSize: 12,
    fontWeight: "700",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    color: "#53687E",
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: "#9F2634",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
})
