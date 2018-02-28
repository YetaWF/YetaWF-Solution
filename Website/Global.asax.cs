/* Copyright © 2018 Softel vdm, Inc. - https://yetawf.com/Documentation/YetaWF/Licensing */

using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.IO;
using System.Web;
using YetaWF.Core;
using YetaWF.Core.Extensions;
using YetaWF.Core.Log;
using YetaWF.Core.Site;
using YetaWF.Core.Support;

#if DEBUG
#endif

namespace YetaWF {
    public class MvcApplication : System.Web.HttpApplication {

        private const string AppSettingsFile = "Appsettings.json";

        public MvcApplication() {
            AcquireRequestState += new EventHandler(MvcApplication_AcquireRequestState);
            EndRequest += MvcApplication_EndRequest;
            Error += MvcApplication_Error;

            YetaWFManager.RootFolder = YetaWFManager.UrlToPhysical("/").TrimEnd(new char[] { '\\' });
            WebConfigHelper.Init(Path.Combine(YetaWFManager.RootFolder, Globals.DataFolder, AppSettingsFile));

            // retrieve the default domain to verify it has been defined in Appsettings.json
            string siteDomain = YetaWFManager.DefaultSiteName;
            // We're renaming the __RequestVerificationToken cookie (not the <input hidden> name) for anti-forgery.
            // We ran into this problem where we host https://yetawf.com in a YetaWF instance (one IIS site) and host
            // http://forum.yetawf.com (another IIS site elsewhere). Because they are the same domain name, just different
            // subdomains, browsers will return TWO __RequestVerificationToken cookies (when the user has visited both
            // sites) causing anti-forgery confusion. This can also be fixed with machinekey settings (forcing both sites
            // to use the same keys). But it is easier to just rename our COOKIE. While both sites will still get
            // both cookies, they now use different names, eliminating the confusion.
            // Please note the distinction between the __RequestVerificationToken COOKIE and the
            // __RequestVerificationToken hidden input field. Only the cookie is renamed. There is no need to
            // rename the input field.
            System.Web.Helpers.AntiForgeryConfig.CookieName = "__ReqVerToken_" + siteDomain;
        }

        private void MvcApplication_EndRequest(object sender, EventArgs e) {
            // Clear all cookies for static requests
            if (YetaWFManager.HaveManager) {
                if (YetaWFManager.Manager.IsStaticSite) {
                    HttpContext context = HttpContext.Current;
                    List<string> cookiesToClear = new List<string>();
                    foreach (string name in context.Request.Cookies) cookiesToClear.Add(name);
                    foreach (string name in cookiesToClear) {
                        HttpCookie cookie = new HttpCookie(name, string.Empty);
                        cookie.Domain = YetaWFManager.Manager.CurrentSite.StaticDomain;
                        cookie.Expires = DateTime.Today.AddYears(-1);
                        context.Response.Cookies.Set(cookie);
                    }
                    // this cookie is added by filehndlr.image
                    if (context.Response.Cookies["ASP.NET_SessionId"] != null)
                        context.Response.Cookies.Remove("ASP.NET_SessionId");
                }
            }
        }

        void MvcApplication_Error(object sender, EventArgs e) {
            // flush log on error, but avoid log spamming
            if (LastError == null || DateTime.Now > ((DateTime)LastError).AddSeconds(10)) {
                Logging.ForceFlush();// make sure this is recorded immediately so we can see it in the log
                LastError = DateTime.Now;
            }
        }
        private static DateTime? LastError = null;// use local time

        void Session_Start(object sender, EventArgs e) {
            // Code that runs when a new session is started

            // Ensure SessionID in order to prevent the following exception
            // when the Application Pool Recycles
            // [HttpException]: Session state has created a session id, but cannot
            // 				   save it because the response was already flushed ...
            string sessionId = Session.SessionID;
        }

        public void MvcApplication_AcquireRequestState(object sender, EventArgs e) {

            HttpRequest httpReq = HttpContext.Current.Request;
            Uri uri = httpReq.Url;

            // Url rewrite can cause "Cannot use a leading .. to exit above the top directory."
            //http://stackoverflow.com/questions/3826299/asp-net-mvc-urlhelper-generateurl-exception-cannot-use-a-leading-to-exit-ab
            httpReq.ServerVariables.Remove("IIS_WasUrlRewritten");

            // Determine which Site folder to use based on URL provided
            bool forcedHost;
            bool newSwitch;
            bool staticHost = false;
            string host = YetaWFManager.GetRequestedDomain(uri, httpReq.QueryString[Globals.Link_ForceSite], out forcedHost, out newSwitch);
            string host2 = null;

            SiteDefinition site = null;

            site = SiteDefinition.LoadStaticSiteDefinition(uri.Host);
            if (site != null) {
                if (forcedHost || newSwitch) throw new InternalError("Static item for forced or new host");
                staticHost = true;
            } else {
                // check if such a site definition exists (accounting for www. or other subdomain)
                string[] domParts = host.Split(new char[] { '.' });
                if (domParts.Length > 2) {
                    if (domParts.Length > 3 || domParts[0] != "www")
                        host2 = host;
                    host = string.Join(".", domParts, domParts.Length - 2, 2);// get just domain as a fallback
                }
                if (!string.IsNullOrWhiteSpace(host2)) {
                    site = SiteDefinition.LoadSiteDefinition(host2);
                    if (site != null)
                        host = host2;
                }
                if (site == null) {
                    site = SiteDefinition.LoadSiteDefinition(host);
                    if (site == null) {
                        if (forcedHost) { // non-existent site requested
                            HttpContext.Current.Response.Status = Logging.AddErrorLog("404 Not Found");
                            HttpContext.Current.ApplicationInstance.CompleteRequest();
                            return;
                        }
                        site = SiteDefinition.LoadSiteDefinition(null);
                        if (site == null) {
                            if (SiteDefinition.INITIAL_INSTALL) {
                                // use a skeleton site for initial install
                                // this will be updated when the model is installed
                                site = new SiteDefinition {
                                    Identity = SiteDefinition.SiteIdentitySeed,
                                    SiteDomain = host,
                                };
                            } else {
                                throw new InternalError("Couldn't obtain a SiteDefinition object");
                            }
                        }
                    }
                }
            }
            // We have a valid request for a known domain or the default domain
            // create a YetaWFManager object to keep track of everything (it serves
            // as a global anchor for everything we need to know while processing this request)
            YetaWFManager manager = YetaWFManager.MakeInstance(host);
            // Site properties are ONLY valid AFTER this call to YetaWFManager.MakeInstance

            manager.CurrentSite = site;
            manager.IsStaticSite = staticHost;

            manager.HostUsed = uri.Host;
            manager.HostPortUsed = uri.Port;
            manager.HostSchemeUsed = uri.Scheme;

            if (forcedHost && newSwitch) {
                if (!manager.HasSuperUserRole) { // if superuser, don't log off (we could be creating a new site)
                    // A somewhat naive way to log a user off, but it's working well and also handles 3rd party logins correctly.
                    // Since this is only used during site development, it's not critical
                    string logoffUrl = WebConfigHelper.GetValue<string>("MvcApplication", "LogoffUrl", null);
                    if (string.IsNullOrWhiteSpace(logoffUrl))
                        throw new InternalError("MvcApplication LogoffUrl not defined in web.cofig/appsettings.json - this is required to switch between sites so we can log off the site-specific currently logged in user");
                    Uri newUri;
                    if (uri.IsLoopback) {
                        // add where we need to go next (w/o the forced domain, we're already on this domain (localhost))
                        newUri = RemoveQsKeyFromUri(uri, Globals.Link_ForceSite);
                    } else {
                        newUri = new Uri("http://" + host);// new site to display
                    }
                    logoffUrl += YetaWFManager.UrlEncodeArgs(newUri.ToString());
                    logoffUrl += (logoffUrl.Contains("?") ? "&" : "?") + "ResetForcedDomain=false";
                    HttpContext.Current.Response.Status = Logging.AddLog("302 Found - {0}", logoffUrl).Truncate(100);
                    HttpContext.Current.Response.AddHeader("Location", manager.CurrentSite.MakeUrl(logoffUrl));
                    HttpContext.Current.ApplicationInstance.CompleteRequest();
                    return;
                }
            }

            // Make sure we're using the "official" URL, otherwise redirect 301
            if (!staticHost && site.EnforceSiteUrl) {
                if (uri.IsAbsoluteUri) {
                    if (!manager.IsLocalHost && !forcedHost && string.Compare(manager.HostUsed, site.SiteDomain, true) != 0) {
                        UriBuilder newUrl = new UriBuilder(uri);
                        newUrl.Host = site.SiteDomain;
                        if (site.EnforceSitePort) {
                            if (newUrl.Scheme == "https") {
                                newUrl.Port = site.PortNumberSSLEval;
                            } else {
                                newUrl.Port = site.PortNumberEval;
                            }
                        }
                        HttpContext.Current.Response.Status = Logging.AddLog("301 Moved Permanently - {0}", newUrl.ToString()).Truncate(100);
                        HttpContext.Current.Response.AddHeader("Location", newUrl.ToString());
                        HttpContext.Current.ApplicationInstance.CompleteRequest();
                        return;
                    }
                }
            }
            // IE rejects our querystrings that have encoded "?" (%3D) even though that's completely valid
            // so we have to turn of XSS protection (which is not necessary in YetaWF anyway)
            HttpContext.Current.Response.Headers.Add("X-Xss-Protection", "0");
        }

        private Uri RemoveQsKeyFromUri(Uri uri, string qsKey) {
            UriBuilder newUri = new UriBuilder(uri);
            NameValueCollection qs = System.Web.HttpUtility.ParseQueryString(newUri.Query);
            qs.Remove(qsKey);
            newUri.Query = qs.ToString();
            return newUri.Uri;
        }
    }
}

