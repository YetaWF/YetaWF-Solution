/* Copyright © 2020 Softel vdm, Inc. - https://yetawf.com/Documentation/YetaWF/Licensing */

// If you get a message like "node sass could not find a binding for your current environment: windows 64-bit with node.js 4.x"
// when running sass, use "npm rebuild node-sass".
// VS 2019: node-gyp can't find VS2019 MSBuild:
// Change C:\Development\YetaWF nginx\Website\node_modules\node-gyp\lib\configure.js
// variables['msbuild_path'] = path.join(vsSetup.path, 'MSBuild', '15.0',
// to
// variables['msbuild_path'] = path.join(vsSetup.path, 'MSBuild', 'Current',

var gulp = require('gulp');
var print = require('gulp-print').default;
var ext_replace = require('gulp-ext-replace');
var lec = require('gulp-line-ending-corrector');

var runSequence = require('gulp4-run-sequence');
gulp.task('DebugBuild', (callback) => {
    return runSequence(['sass', 'less'], 'ts', 'copydts', ['images-webp'], callback);
});
gulp.task('ReleaseBuild', (callback) => {
    return runSequence(['sass', 'less'], ['ts', 'tslint'], 'copydts', ["minify-js", "minify-css"], ['images-webp'], callback);
});

/* TypeScript Compile */
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var tsFolders = [
    "**/*.ts",
    "**/*.tsx",
    "!**/*.d.ts",
    "!node_modules/**",
    "!node_modules"
];
gulp.task('ts', () => {
    var tsProject = ts.createProject('tsconfig.json');
    return gulp.src(tsFolders, { follow: true })
        .pipe(print())
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(lec({ eolc: 'CRLF' })) //OMG - We'll deal with it later...
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(function (file) {
            return file.base;
        }));
});

/* TypeScript Lint */
var tslint = require("gulp-tslint");
gulp.task("tslint", () => {
    return gulp.src(tsFolders, { follow: true })
        .pipe(print())
        .pipe(tslint({
            formatter: "msbuild",
            configuration: "./tslint.json"
        }))
        .pipe(tslint.report({
            reportLimit: 50
        }));
    }
);


/* Scss Compile */
var sass = require('gulp-sass');
var sassFolders = [
    "Addons/**/*.scss",
    "Vault/**/*.scss"
];
gulp.task('sass', () => {

    var postcss = require('gulp-postcss');
    //var sourcemaps = require('gulp-sourcemaps');
    var autoprefixer = require('autoprefixer');

    return gulp.src(sassFolders, { follow: true })
        .pipe(print())
        .pipe(sass({
            includePaths: "node_modules",
        }))
        .pipe(ext_replace('.css'))
        .pipe(lec({ eolc: 'CRLF' })) //OMG - We'll deal with it later...
        .pipe(postcss([autoprefixer()]))
        .pipe(gulp.dest(function (file) {
            return file.base;
    }));
});

/* Less Compile */
var less = require('gulp-less');
var lessFolders = [
    "Addons/**/*.less",
    "Vault/**/*.less",
    "!**/*.min.less",
    "!**/*.pack.less"
];
gulp.task('less', () => {
    return gulp.src(lessFolders, { follow: true })
        .pipe(print())
        .pipe(less())
        .pipe(ext_replace(".css"))
        .pipe(lec({ eolc: 'CRLF' })) //OMG - We'll deal with it later...
        .pipe(gulp.dest(function (file) {
            return file.base;
        }));
    }
);


/* Javascript minify */
var minify = require("gulp-minify");
gulp.task('minify-js', () => {
    return gulp.src(["Addons/**/*.js",
            "AddonsCustom/**/*.js",
            "!**/*.min.js",
            "!**/*.pack.js"
        ], { follow: true })
        .pipe(print())
        .pipe(minify({
            ext: {
                src: '.js',
                min: '.min.js'
            },
            nosource: true,
            ignoreFiles: ['.min.js', '.pack.js']
        }))
        .pipe(gulp.dest(function (file) {
            return file.base;
        }));
    }
);

/* CSS Minify */
var cleanCSS = require('gulp-clean-css');
gulp.task('minify-css', () => {
    return gulp.src(["Addons/**/*.css",
            "AddonsCustom/**/*.css",
            "Vault/**/*.css",
            "node_modules/normalize-css/*.css",
            "node_modules/smartmenus/dist/addons/bootstrap-4/*.css",
            "!**/*.min.css",
            "!**/*.pack.css"
        ], { follow: true })
        .pipe(print())
        .pipe(cleanCSS({
            compatibility: { properties: { zeroUnits: false } },
            inline: ['local'], // enables local inlining
            rebase: false // don't change url()
        }))
        .pipe(ext_replace(".min.css"))
        .pipe(gulp.dest(function (file) {
            return file.base;
        }));
    }
);

/* Copy required *.d.ts files */
var dtsFolders = [
    "Addons/YetaWF/Core/_Addons/Basics/*.d.ts",
    "Addons/YetaWF/Core/_Addons/Forms/*.d.ts",
    "Addons/YetaWF/Core/_Addons/Popups/*.d.ts",
    "Addons/YetaWF/ComponentsHTML/_Addons/Forms/*.d.ts",
    "Addons/YetaWF/ComponentsHTML/_Addons/Popups/*.d.ts",
    "Addons/YetaWF/ComponentsHTML/_Main/ComponentsHTML.d.ts",
    "Addons/YetaWF/ComponentsHTML/_Main/Controls.d.ts",
    "Addons/YetaWF/ComponentsHTML/_Templates/**/*.d.ts",
];
gulp.task('copydts', function () {
    return gulp.src(dtsFolders, { follow: true })
        .pipe(print())
        .pipe(gulp.dest('./node_modules/@types/YetaWF/HTML/'));
});

/* Images -> webp */
var webp = require("gulp-webp");
gulp.task('images-webp', () => {
    return gulp.src([
        "Addons/**/*.png",
        "Addons/**/*.jpg",
        "Addons/**/*.jpeg",
        "AddonsCustom/**/*.png",
        "AddonsCustom/**/*.jpg",
        "AddonsCustom/**/*.jpeg",
        "**/YetaWF_Modules/**/Images/*.png",
        "**/YetaWF_Modules/**/Images/*.jpg",
        "!**/Assets/**"
    ], { follow: true })
    .pipe(print())
    .pipe(webp())
    .pipe(ext_replace(".webp-gen"))
    //.pipe(gulp.dest('dist'));
    .pipe(gulp.dest(function (file) {
        return file.base;
    }));
});

gulp.task('watch', function () {
    gulp.watch(tsFolders, ['ts']);
    gulp.watch(dtsFolders, ['copydts']);
    gulp.watch(sassFolders, ['sass']);
    gulp.watch(lessFolders, ['less']);
});



