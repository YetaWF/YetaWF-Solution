/* Copyright © 2018 Softel vdm, Inc. - https://yetawf.com/Documentation/YetaWF/Licensing */

using System.Web.Mvc;
using System.Web.Routing;
using YetaWF.Core.DataProvider;
using YetaWF.Core.Log;
using YetaWF.Core.Packages;
using YetaWF.Core.Site;
using YetaWF.Core.Support;

[assembly: WebActivatorEx.PostApplicationStartMethod(typeof(YetaWF.App_Start.Startup), "Start")]

namespace YetaWF.App_Start {
    public class Startup {

        public static void Start() {

            YetaWFManager manager = YetaWFManager.MakeInstance("__STARTUP"); // while loading packages we need a manager
            manager.CurrentSite = new SiteDefinition();

            Logging.SetupLogging();
            Logging.AddLog("YetaWF.App_Start.Startup starting");

            RouteTable.Routes.IgnoreRoute("File.image/{*pathInfo}");
            RouteTable.Routes.IgnoreRoute("FileHndlr.image/{*pathInfo}");

            Logging.AddLog("Calling AreaRegistration.RegisterAllAreas()");
            AreaRegistration.RegisterAllAreas();
            Logging.AddLog("Adding filters");
            //GlobalFilters.Filters.Add(new HandleErrorAttribute());

            Logging.AddLog("Adding catchall route");
            RouteTable.Routes.MapRoute(
                "Page",
                "{*__path}",
                new { controller = "Page", action = "Show" },
                new string[] { "YetaWF.Core.Controllers", } // namespace
            );

            // External data providers
            ExternalDataProviders.RegisterExternalDataProviders();
            // Call all classes that expose the interface IInitializeApplicationStartup
            YetaWF.Core.Support.Startup.CallStartupClasses();

            // Find all the views/areas that are available to the website (i.e., core + modules)
            ViewEnginesStartup.Start();

            Package.UpgradeToNewPackages();

            YetaWF.Core.Support.Startup.Started = true;
            Logging.AddLog("YetaWF.App_Start.Startup completed");
        }
    }
}