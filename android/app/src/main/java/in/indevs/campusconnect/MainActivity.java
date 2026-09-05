package in.indevs.campusconnect;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    private SwipeRefreshLayout swipeRefreshLayout;
    private FrameLayout errorOverlay;
    private WebView webView;
    private long lastBackPressTime = 0;
    private boolean isInputFocused = false;
    private boolean isModalOpen = false;
    private boolean isOffline = false;

    private static final Set<String> ROOT_EXIT_PATHS = new HashSet<>(Arrays.asList(
            "/",
            "/auth",
            "/auth/login",
            "/app/dashboard",
            "/faculty/dashboard",
            "/admin",
            "/admin/overview",
            "/platform/admin/dashboard",
            "/platform/admin-control/dashboard",
            "/super-admin"
    ));

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Access underlying Capacitor WebView
        webView = getBridge().getWebView();
        if (webView == null) return;

        configureWebViewSecurity();
        setupSwipeRefresh();
        setupSmartSelectionAndBridge();
        setupErrorOverlay();
        setupNetworkMonitoring();
        setupSmartBackNavigation();

        // Handle cold start Verified App Links
        handleIncomingDeepLink(getIntent(), true);
    }

    /**
     * Hardened WebView Security Configuration
     * Prevents arbitrary navigation, disables file access, disables zoom, disables debugging.
     */
    private void configureWebViewSecurity() {
        WebSettings settings = webView.getSettings();

        // 1. Disable Zoom
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // 2. Strict File Access Hardening (CWE-73 / CWE-79 mitigation)
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);

        // 3. Block Mixed Content (HTTPS only)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // 4. Web Storage
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // 5. Disable WebView Debugging in Release Builds
        WebView.setWebContentsDebuggingEnabled(false);

        // 6. Secure WebViewClient for strict domain filtering
        webView.setWebViewClient(new SecureBridgeWebViewClient(getBridge()));
    }

    /**
     * Custom BridgeWebViewClient ensuring:
     * - Only trusted Campus Connect & Supabase domains are loaded internally.
     * - All external links (WhatsApp, external sites, tel, mailto) open in native apps / external browser.
     * - Main frame errors show the branded Dark Navy offline overlay.
     */
    private class SecureBridgeWebViewClient extends BridgeWebViewClient {
        public SecureBridgeWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (uri == null) return false;

            String scheme = uri.getScheme();
            String host = uri.getHost();

            // Native scheme handlers (tel, mailto, sms, whatsapp)
            if ("tel".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme) || "sms".equalsIgnoreCase(scheme)) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    return true;
                } catch (Exception ignored) {
                    return true;
                }
            }

            // In-app allowed domains
            if (isTrustedHost(host)) {
                return super.shouldOverrideUrlLoading(view, request);
            }

            // All external web links MUST be opened externally in Android's default browser
            if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                try {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(browserIntent);
                    return true;
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Unable to open external link", Toast.LENGTH_SHORT).show();
                    return true;
                }
            }

            return super.shouldOverrideUrlLoading(view, request);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request != null && request.isForMainFrame()) {
                showErrorOverlay(true);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (swipeRefreshLayout != null && swipeRefreshLayout.isRefreshing()) {
                swipeRefreshLayout.setRefreshing(false);
            }
            showErrorOverlay(false);
            injectClientHelpers();
        }
    }

    private boolean isTrustedHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        return host.equals("campusconnect.indevs.in")
                || host.endsWith(".campusconnect.indevs.in")
                || host.equals("alllxeqkxhdjyyyavyai.supabase.co")
                || host.endsWith(".supabase.co")
                || host.equals("localhost"); // for local Capacitor bridge initialization
    }

    private boolean isCurrentPageTrusted() {
        if (webView == null || webView.getUrl() == null) return false;
        try {
            Uri current = Uri.parse(webView.getUrl());
            return isTrustedHost(current.getHost());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Set up intelligent Pull-to-Refresh with Cyan branding.
     * Prevents triggering when scrolled down, inside input fields, or inside modals.
     */
    private void setupSwipeRefresh() {
        ViewGroup parent = (ViewGroup) webView.getParent();
        if (parent == null) return;

        int index = parent.indexOfChild(webView);
        ViewGroup.LayoutParams layoutParams = webView.getLayoutParams();
        parent.removeView(webView);

        swipeRefreshLayout = new SwipeRefreshLayout(this);
        swipeRefreshLayout.setLayoutParams(layoutParams);
        swipeRefreshLayout.setColorSchemeColors(
                Color.parseColor("#06B6D4"), // Cyan 500
                Color.parseColor("#0EA5E9")  // Sky 500
        );
        swipeRefreshLayout.setProgressBackgroundColorSchemeColor(Color.parseColor("#111C30")); // Dark Navy Card

        // Smart pull-to-refresh constraint
        swipeRefreshLayout.setOnChildScrollUpCallback((parentLayout, child) -> {
            // Cannot refresh if scrolled down
            if (webView.getScrollY() > 0) return true;
            // Cannot refresh while typing or when modal/sheet is open
            if (isInputFocused || isModalOpen) return true;
            return false;
        });

        swipeRefreshLayout.setOnRefreshListener(() -> {
            if (!isOnline()) {
                swipeRefreshLayout.setRefreshing(false);
                showErrorOverlay(true);
                return;
            }
            webView.reload();
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (swipeRefreshLayout.isRefreshing()) {
                    swipeRefreshLayout.setRefreshing(false);
                }
            }, 3500);
        });

        swipeRefreshLayout.addView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        parent.addView(swipeRefreshLayout, index);
    }

    /**
     * Disable body text selection and copy context menus,
     * while completely preserving full editing, cursor, and clipboard behavior on input fields.
     */
    private void setupSmartSelectionAndBridge() {
        // Javascript Bridge for DOM observation with domain validation
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void setInputFocused(boolean focused) {
                if (isCurrentPageTrusted()) {
                    isInputFocused = focused;
                }
            }

            @JavascriptInterface
            public void setModalOpen(boolean open) {
                if (isCurrentPageTrusted()) {
                    isModalOpen = open;
                }
            }

            @JavascriptInterface
            public void onPageReady() {
                if (isCurrentPageTrusted()) {
                    runOnUiThread(() -> {
                        if (swipeRefreshLayout != null && swipeRefreshLayout.isRefreshing()) {
                            swipeRefreshLayout.setRefreshing(false);
                        }
                        showErrorOverlay(false);
                    });
                }
            }
        }, "CampusConnectAndroid");

        // Disable long-click selection menu on regular text, allow on input fields
        webView.setOnLongClickListener(v -> !isInputFocused);

        // Inject CSS and DOM listeners
        injectClientHelpers();
    }

    private void injectClientHelpers() {
        webView.post(() -> {
            String script = "(function() {" +
                    "  if (window.__CC_NATIVE_INITIALIZED__) return;" +
                    "  window.__CC_NATIVE_INITIALIZED__ = true;" +
                    "  var style = document.createElement('style');" +
                    "  style.id = 'cc-selection-rules';" +
                    "  style.innerHTML = '*:not(input):not(textarea):not([contenteditable=\"true\"]) {' +" +
                    "    '-webkit-user-select: none !important;' +" +
                    "    'user-select: none !important;' +" +
                    "    '-webkit-touch-callout: none !important;' +" +
                    "  }' +" +
                    "  'input, textarea, [contenteditable=\"true\"] {' +" +
                    "    '-webkit-user-select: text !important;' +" +
                    "    'user-select: text !important;' +" +
                    "    '-webkit-touch-callout: default !important;' +" +
                    "  }';" +
                    "  if (!document.getElementById('cc-selection-rules')) document.head.appendChild(style);" +
                    "  document.addEventListener('focusin', function(e) {" +
                    "    var t = e.target;" +
                    "    var tag = (t.tagName || '').toLowerCase();" +
                    "    var isInput = tag === 'input' || tag === 'textarea' || t.isContentEditable;" +
                    "    if (window.CampusConnectAndroid) window.CampusConnectAndroid.setInputFocused(isInput);" +
                    "  }, true);" +
                    "  document.addEventListener('focusout', function(e) {" +
                    "    if (window.CampusConnectAndroid) window.CampusConnectAndroid.setInputFocused(false);" +
                    "  }, true);" +
                    "  var observer = new MutationObserver(function() {" +
                    "    var hasModal = !!document.querySelector('[role=\"dialog\"], [role=\"alertdialog\"], [data-state=\"open\"], .sheet-content, [data-radix-popper-content-wrapper]');" +
                    "    if (window.CampusConnectAndroid) window.CampusConnectAndroid.setModalOpen(hasModal);" +
                    "  });" +
                    "  observer.observe(document.body, { childList: true, subtree: true, attributes: true });" +
                    "  if (window.CampusConnectAndroid) window.CampusConnectAndroid.onPageReady();" +
                    "})();";
            webView.evaluateJavascript(script, null);
        });
    }

    /**
     * Clean Campus Connect styled offline / error state with "Try Again" button.
     */
    private void setupErrorOverlay() {
        FrameLayout rootLayout = findViewById(android.R.id.content);
        if (rootLayout == null) return;

        errorOverlay = new FrameLayout(this);
        errorOverlay.setBackgroundColor(Color.parseColor("#0B1220")); // Dark Navy Brand
        errorOverlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        errorOverlay.setVisibility(View.GONE);

        LinearLayout contentLayout = new LinearLayout(this);
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        contentLayout.setGravity(Gravity.CENTER);
        contentLayout.setPadding(48, 48, 48, 48);
        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        contentParams.gravity = Gravity.CENTER;
        contentLayout.setLayoutParams(contentParams);

        // App Logo Icon
        ImageView logoView = new ImageView(this);
        logoView.setImageResource(R.mipmap.ic_launcher);
        int iconSize = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 80, getResources().getDisplayMetrics());
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(iconSize, iconSize);
        logoParams.bottomMargin = 36;
        contentLayout.addView(logoView, logoParams);

        // Title
        TextView titleView = new TextView(this);
        titleView.setText("No Internet Connection");
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleParams.bottomMargin = 16;
        contentLayout.addView(titleView, titleParams);

        // Message
        TextView descView = new TextView(this);
        descView.setText("Please check your network and try again to continue using Campus Connect.");
        descView.setTextColor(Color.parseColor("#94A3B8")); // Slate 400
        descView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        descView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams descParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        descParams.bottomMargin = 36;
        contentLayout.addView(descView, descParams);

        // Try Again Button
        Button retryButton = new Button(this);
        retryButton.setText("Try Again");
        retryButton.setTextColor(Color.parseColor("#0B1220")); // Navy Text
        retryButton.setBackgroundColor(Color.parseColor("#06B6D4")); // Cyan Button
        retryButton.setTypeface(Typeface.DEFAULT_BOLD);
        retryButton.setPadding(48, 20, 48, 20);
        retryButton.setOnClickListener(v -> {
            if (isOnline()) {
                showErrorOverlay(false);
                if (swipeRefreshLayout != null) swipeRefreshLayout.setRefreshing(true);
                webView.reload();
            } else {
                Toast.makeText(this, "Still offline. Please check your connection.", Toast.LENGTH_SHORT).show();
            }
        });
        contentLayout.addView(retryButton);

        errorOverlay.addView(contentLayout);
        rootLayout.addView(errorOverlay);
    }

    private void showErrorOverlay(boolean show) {
        runOnUiThread(() -> {
            if (errorOverlay != null) {
                errorOverlay.setVisibility(show ? View.VISIBLE : View.GONE);
            }
            if (swipeRefreshLayout != null) {
                swipeRefreshLayout.setEnabled(!show);
            }
        });
    }

    /**
     * Automatic network recovery listener.
     */
    private void setupNetworkMonitoring() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return;

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();

        cm.registerNetworkCallback(request, new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                runOnUiThread(() -> {
                    if (isOffline) {
                        isOffline = false;
                        showErrorOverlay(false);
                        webView.reload();
                    }
                });
            }

            @Override
            public void onLost(@NonNull Network network) {
                runOnUiThread(() -> {
                    isOffline = true;
                });
            }
        });
    }

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    /**
     * Smart Android Back Navigation:
     * 1. Close keyboard if open.
     * 2. Close open modal/drawer/sheet/dialog first.
     * 3. Navigate back in web history if available.
     * 4. Double-back-to-exit with toast when at root/home/dashboard.
     */
    private void setupSmartBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // Priority 1: Dismiss soft keyboard
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                View currentFocus = getCurrentFocus();
                if (currentFocus != null && imm != null && imm.isActive()) {
                    imm.hideSoftInputFromWindow(currentFocus.getWindowToken(), 0);
                    currentFocus.clearFocus();
                    if (isInputFocused) {
                        isInputFocused = false;
                        return;
                    }
                }

                // Priority 2: Dismiss open modals / drawers / bottom sheets
                if (isModalOpen) {
                    webView.evaluateJavascript(
                            "(function() {" +
                            "  var esc = new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true});" +
                            "  document.dispatchEvent(esc);" +
                            "  var closeBtn = document.querySelector('[role=\"dialog\"] button[aria-label*=\"Close\"], [data-state=\"open\"] button[aria-label*=\"Close\"], .sheet-content button[aria-label*=\"Close\"], [data-radix-popper-content-wrapper] button');" +
                            "  if (closeBtn) { closeBtn.click(); return true; }" +
                            "  return true;" +
                            "})();",
                            null
                    );
                    return;
                }

                // Priority 3 & 4: Check history vs Root routes
                String currentUrl = webView.getUrl();
                boolean isRoot = isRootOrExitRoute(currentUrl);

                if (!isRoot && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Double-back to exit
                    long now = System.currentTimeMillis();
                    if (now - lastBackPressTime < 2000) {
                        finish();
                    } else {
                        lastBackPressTime = now;
                        Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        });
    }

    private boolean isRootOrExitRoute(String url) {
        if (url == null || url.isEmpty()) return true;
        try {
            Uri uri = Uri.parse(url);
            String path = uri.getPath();
            if (path == null || path.isEmpty()) return true;
            return ROOT_EXIT_PATHS.contains(path);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingDeepLink(intent, false);
    }

    /**
     * Handle incoming deep links / verified app links.
     * Cold start: directly directs the WebView to the requested URL so default fallback is bypassed.
     * Warm start: super.onNewIntent notifies Capacitor's App plugin which fires appUrlOpen in JS.
     */
    private void handleIncomingDeepLink(Intent intent, boolean isColdStart) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data != null && webView != null && isTrustedHost(data.getHost())) {
            if (isColdStart) {
                webView.loadUrl(data.toString());
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        injectClientHelpers();
    }
}
