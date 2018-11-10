const gulp = require('gulp');
const gutil = require('gulp-util');
const sass = require('gulp-sass');
const pug = require('gulp-pug');
const filter = require('gulp-filter');
var webserver = require('gulp-webserver');

const src = './src/'
const sass_src = src + 'sass/**/*.sass'
const js_src = src + 'js/**/*.js'
const pug_src = src + 'pug/**/*.pug'
const assets_src = src + 'assets/**/*'

const out = './docs/'

gulp.task('webserver', function() {
  gulp.src(out)
    .pipe(webserver({
      livereload: true,
      directoryListing: false,
      open: false
    }));
});

gulp.task('js', function() {
  return gulp.src(js_src)
             .pipe(gulp.dest(out))
});

gulp.task('sass', function () {
  return gulp.src(sass_src)
             .pipe(sass().on('error', sass.logError))
             .pipe(gulp.dest(out));
});

const isPartFilter = filter(file => !file.basename.startsWith('_'));
gulp.task('pug', function() {
  return gulp.src(pug_src)
             .pipe(isPartFilter)
             .pipe(pug({}).on('error', gutil.log))
             .pipe(gulp.dest(out));
});

gulp.task('assets', function() {
  return gulp.src(assets_src)
             .pipe(gulp.dest(out + 'assets'));
});

gulp.task('vendor', function() {
  return gulp.src([
    'node_modules/bootstrap/dist/css/bootstrap.min.css',
    'node_modules/bootstrap/dist/js/bootstrap.min.js',
    'node_modules/jquery/dist/jquery.min.js',
    'node_modules/highcharts/highcharts.js'
  ])
  .pipe(gulp.dest(out + 'vendor'));
});

gulp.task('default', gulp.parallel('js', 'sass', 'pug', 'assets', 'vendor'))
gulp.task('dev', gulp.parallel('default', 'webserver'))
