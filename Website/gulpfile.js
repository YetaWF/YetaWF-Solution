/* Copyright © 2017 Softel vdm, Inc. - https://yetawf.com/Documentation/YetaWF/Licensing */

var gulp = require('gulp');
var print = require('gulp-print');
var ext_replace = require('gulp-ext-replace');
var lec = require('gulp-line-ending-corrector');


gulp.task('default', function () {
    // place code for your default task here
});

var runSequence = require('run-sequence');
gulp.task('DebugBuild', () => {
    runSequence(['sass', 'less'], 'ts');
});
gulp.task('ReleaseBuild', () => {
    runSequence(['sass', 'less', 'less-global'], ['ts', 'tslint'], ["minify-js", "minify-css", "minify-globals-css"]);
});

/* TypeScript Compile */
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
gulp.task('ts', () => {
    var tsProject = ts.createProject('tsconfig.json');
    gulp.src([
            "**/*.ts",
            "**/*.tsx",
            "!**/*.d.ts",
            "!node_modules/**",
            "!node_modules",
            "!AddOns/YetaWF/Core/_JS/**",
            "!AddOns/YetaWF/Core/_JS"
        ], { follow: true })
        .pipe(print())
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(lec({ eolc: 'CRLF' })) //OMG - We'll deal with it later...
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(function (file) {
            return file.base;
        }));
}
);

/* TypeScript Lint */
var tslint = require("gulp-tslint");
gulp.task("tslint", () =>
    gulp.src([
            "**/*.ts",
            "**/*.tsx",
            "!**/*.d.ts",
            "!node_modules/**",
            "!node_modules",
            "!AddOns/YetaWF/Core/_JS/**",
            "!AddOns/YetaWF/Core/_JS"
        ], { follow: true })
        .pipe(print())
        .pipe(tslint({
            formatter: "msbuild",
            configuration: "./tslint.json"
        }))
        .pipe(tslint.report({
            reportLimit: 50
        }))
);

/* Scss Compile */
var sass = require('gulp-sass');
gulp.task('sass', () =>
    gulp.src([
            "AddOns/**/*.scss",
            "Vault/**/*.scss",
            "!AddOns/YetaWF/Core/_JS/**",
            "!AddOns/YetaWF/Core/_JS"
        ], { follow: true })
        .pipe(print())
        .pipe(sass())
        .pipe(ext_replace('.css'))
        .pipe(lec({ eolc: 'CRLF' })) //OMG - We'll deal with it later...
        .pipe(gulp.dest(function (file) {
            return file.base;
        })
    )
);

/* Less Compile */
var less = require('gulp-less');
gulp.task('less', () =>
    gulp.src([
            "AddOns/**/*.less",
            "Vault/**/*.less",
            //"!AddOns/YetaWF/Core/_JS/**",
            //"!AddOns/YetaWF/Core/_JS",
            "!**/*.min.less",
            "!**/*.pack.less"
        ], { follow: true })
        .pipe(print())
        .pipe(less())
        .pipe(ext_replace(".css"))
        .pipe(lec({ eolc: 'CRLF' })) //OMG - We'll deal with it later...
        .pipe(gulp.dest(function (file) {
            return file.base;
        }))
);
gulp.task('less-global', () =>
    gulp.src([
            "Content/bootstrap/bootstrap.less",
            "Content/bootstrap/theme.less",
            "!**/*.min.less",
            "!**/*.pack.less"
        ], { follow: true })
        .pipe(print())
        .pipe(less())
        .pipe(ext_replace(".css"))
        .pipe(lec({ eolc: 'CRLF' })) //OMG - We'll deal with it later...
        .pipe(gulp.dest(function (file) {
            return file.base;
        }))
);

/* Javascript minify */
var minify = require("gulp-minify");
gulp.task('minify-js', () =>
    gulp.src(["AddOns/**/*.js",
            "AddOnsCustom/**/*.js",
            "node_modules/jquery-validation-unobtrusive/*.js",
            "node_modules/urijs/src/*.js",
            "!AddOns/YetaWF/Core/_JS/clipboardjs.com/**",
            "!AddOns/YetaWF/Core/_JS/clipboardjs.com",
            "!AddOns/YetaWF/Core/_JS/github.com.vadikom/**",
            "!AddOns/YetaWF/Core/_JS/github.com.vadikom",
            "!AddOns/YetaWF/Core/_JS/google.com.swfobject/**",
            "!AddOns/YetaWF/Core/_JS/google.com.swfobject",
            "!AddOns/YetaWF/Core/_JS/jqueryui.com/jqueryui-themes",
            "!AddOns/YetaWF/Core/_JS/jqueryui.com/jqueryui-themes/**",
            "!AddOns/YetaWF/Core/_JS/medialize.github.io/**",
            "!AddOns/YetaWF/Core/_JS/medialize.github.io",
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
        }))
);

/* CSS Minify */
var cleanCSS = require('gulp-clean-css');
gulp.task('minify-css', () =>
    gulp.src(["AddOns/**/*.css",
            "AddOnsCustom/**/*.css",
            "Vault/**/*.css",
            "node_modules/normalize-css/*.css",
            "node_modules/smartmenus/dist/addons/bootstrap/*.css",
            "!AddOns/YetaWF/Core/_JS/clipboardjs.com/**",
            "!AddOns/YetaWF/Core/_JS/clipboardjs.com",
            "!AddOns/YetaWF/Core/_JS/github.com.vadikom/**",
            "!AddOns/YetaWF/Core/_JS/github.com.vadikom",
            "!AddOns/YetaWF/Core/_JS/google.com.swfobject/**",
            "!AddOns/YetaWF/Core/_JS/google.com.swfobject",
            "!AddOns/YetaWF/Core/_JS/jqueryui.com/jqueryui-themes",
            "!AddOns/YetaWF/Core/_JS/jqueryui.com/jqueryui-themes/**",
            "!AddOns/YetaWF/Core/_JS/medialize.github.io/**",
            "!AddOns/YetaWF/Core/_JS/medialize.github.io",
            "!**/*.min.css",
            "!**/*.pack.css"
        ], { follow: true })
        .pipe(print())
        .pipe(cleanCSS({
            compatibility: 'ie8',
            inline: ['local'], // enables local inlining
            rebase: false // don't change url()
        }))
        .pipe(ext_replace(".min.css"))
        .pipe(gulp.dest(function (file) {
            return file.base;
        }))
);

/* CSS Minify for global addons */
gulp.task('minify-globals-css', () =>
    gulp.src(["AddOns/YetaWF/Core/_JS/**/*.css",
            "Content/**/*.css",
            "!**/*.min.css",
            "!**/*.pack.css"
        ], { follow: true })
        .pipe(print())
        .pipe(cleanCSS({
            compatibility: 'ie8',
            inline: ['local'], // enables local inlining
            rebase: false // don't change url()
        }))
        .pipe(ext_replace(".min.css"))
        .pipe(gulp.dest(function (file) {
            return file.base;
        }))
);


