import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { LinearGradient } from "expo-linear-gradient"
import { useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import WebView from "react-native-webview"

import httpClient from "../../src/lib/httpClient"

const POLICY_PATH = "/app/shift/views/hrpolicy.html"

async function fetchPolicyHtml() {
  const response = await httpClient.get(POLICY_PATH, {
    headers: { Accept: "text/html,*/*" },
    responseType: "text",
    transformResponse: [(data) => data],
  })
  return response.data
}

function buildMobileDocument(rawHtml) {
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F7F9FC;
      color: #1C2B36;
      font-size: 15px;
      line-height: 1.75;
      padding: 0 16px 40px;
      -webkit-font-smoothing: antialiased;
    }

    /* Remove all legacy inline styles from server */
    [style] { font-size: inherit !important; line-height: inherit !important; }

    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1F2F3B;
      margin: 28px 0 8px;
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 3px solid #F5A300;
      text-decoration: none !important;
    }
    h1 center { display: block; }
    h1 u, h1 U { text-decoration: none; }

    h2 {
      font-size: 17px;
      font-weight: 700;
      color: #1F2F3B;
      margin: 28px 0 10px;
      padding: 10px 14px;
      background: #EFF3F7;
      border-left: 4px solid #F5A300;
      border-radius: 0 8px 8px 0;
    }

    h3 {
      font-size: 15px;
      font-weight: 600;
      color: #2C4A5C;
      margin: 18px 0 8px;
    }

    p {
      margin-bottom: 12px;
      color: #3A4F5C;
    }

    ul, ol {
      padding-left: 20px;
      margin: 10px 0 16px;
    }

    li {
      margin-bottom: 10px;
      color: #3A4F5C;
      line-height: 1.7;
    }

    /* guideline label style (e.g. "1.1: GUIDELINES:" inside <u><li>) */
    li u, li U {
      font-weight: 700;
      color: #1F2F3B;
      text-decoration: underline;
      text-decoration-color: #F5A300;
      font-size: 14px;
      letter-spacing: 0.3px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      border-radius: 8px;
      overflow: hidden;
      font-size: 14px;
    }

    td, th {
      padding: 10px 12px;
      border: 1px solid #DDE3E9;
      vertical-align: top;
      color: #3A4F5C;
    }

    tr:nth-child(even) td { background: #F0F4F8; }
    tr:first-child td, th {
      background: #1F2F3B;
      color: #FFFFFF;
      font-weight: 600;
    }

    /* section card style for each major block */
    .section-block {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    }

    .Table1 {
      background: #FFFFFF;
      border: none;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    }

    .detail {
      background: #FFFFFF;
      border: none;
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
      box-shadow: 0 1px 6px rgba(0,0,0,0.06);
    }

    /* override server's content_div */
    .content_div, .content1_div, .content2_div {
      background: transparent !important;
      margin-bottom: 0 !important;
      font-style: normal !important;
      font-size: 15px !important;
      line-height: 1.75 !important;
      text-align: left !important;
    }

    /* divider between sections */
    hr {
      border: none;
      border-top: 1px solid #DDE3E9;
      margin: 20px 0;
    }

    a { color: #F5A300; }

    /* prevent horizontal overflow */
    img, video, iframe { max-width: 100%; }

    /* remove base tag effects */
    .col-md-1, .col-md-10 {
      display: block;
      width: 100%;
      padding: 0;
    }
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes" />
  <title>HR Policy</title>
  <style>${css}</style>
</head>
<body>
  ${rawHtml}
</body>
</html>`
}

export default function HrPolicyScreen() {
  const webviewRef = useRef(null)
  const [webviewLoading, setWebviewLoading] = useState(true)

  const policyQuery = useQuery({
    queryKey: ["hr-policy"],
    queryFn: fetchPolicyHtml,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })

  const styledHtml = policyQuery.data
    ? buildMobileDocument(policyQuery.data)
    : null

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      {/* Banner */}
      <LinearGradient
        colors={["#1F2F3B", "#2C4A5C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.bannerIconWrap}>
          <Ionicons name="document-text" size={28} color="#F5A300" />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>General Policy</Text>
          <Text style={styles.bannerSub}>Windfall Productions Pvt Ltd.</Text>
        </View>
        {policyQuery.isSuccess && (
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>LIVE</Text>
          </View>
        )}
      </LinearGradient>

      {/* Content area */}
      <View style={styles.body}>
        {/* Fetching state */}
        {policyQuery.isPending && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#F5A300" />
            <Text style={styles.loadingTitle}>Loading Policy</Text>
            <Text style={styles.loadingSubtitle}>
              Fetching the latest HR guidelines…
            </Text>
          </View>
        )}

        {/* Error state */}
        {policyQuery.isError && (
          <View style={styles.center}>
            <View style={styles.errorIconWrap}>
              <Ionicons
                name="cloud-offline-outline"
                size={52}
                color="#E05555"
              />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Policy</Text>
            <Text style={styles.errorSub}>
              {policyQuery.error?.message || "Network error. Please try again."}
            </Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => policyQuery.refetch()}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* WebView */}
        {styledHtml && (
          <>
            <WebView
              ref={webviewRef}
              originWhitelist={["*"]}
              source={{
                html: styledHtml,
                baseUrl: "http://14.143.148.218:8080",
              }}
              style={styles.webview}
              onLoadStart={() => setWebviewLoading(true)}
              onLoadEnd={() => setWebviewLoading(false)}
              showsVerticalScrollIndicator={false}
              allowsFullscreenVideo={false}
              javaScriptEnabled={false}
              domStorageEnabled={false}
              scalesPageToFit={false}
            />
            {webviewLoading && (
              <View style={styles.webviewOverlay}>
                <ActivityIndicator size="large" color="#F5A300" />
                <Text style={styles.loadingTitle}>Rendering…</Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  /* banner */
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  bannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    fontStyle: "italic",
  },
  liveTag: {
    backgroundColor: "#27AE60",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },

  /* body wrapper */
  body: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  /* webview */
  webview: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  webviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  /* center (loading / error) */
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2F3B",
    marginTop: 8,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: "#7A8FA0",
    textAlign: "center",
  },

  /* error */
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2F3B",
    textAlign: "center",
  },
  errorSub: {
    fontSize: 13,
    color: "#7A8FA0",
    textAlign: "center",
    marginBottom: 8,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1F2F3B",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
})
