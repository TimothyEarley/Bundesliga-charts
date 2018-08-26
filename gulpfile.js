const gulp = require('gulp');
const gutil = require('gulp-util');
const coffeescript = require('gulp-coffeescript');
const sass = require('gulp-sass');
const pug = require('gulp-pug');
const filter = require('gulp-filter');

const src = './src/'
const sass_src = src + 'sass/**/*.sass'
const coffee_src = src + 'coffee/**/*.coffee'
const pug_src = src + 'pug/**/*.pug'
const assets_src = src + 'assets/**/*'

const out = './docs/'

gulp.task('coffee', function() {
  return gulp.src(coffee_src)
             .pipe(coffeescript({bar: true}).on('error', gutil.log))
             .pipe(gulp.dest(out));
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


gulp.task('coffee:watch', function () {
  return gulp.watch(coffee_src, gulp.parallel('coffee'));
});

gulp.task('sass:watch', function () {
  return gulp.watch(sass_src, gulp.parallel('sass'));
});

gulp.task('pug:watch', function () {
  return gulp.watch(pug_src, gulp.parallel('pug'));
});

gulp.task('assets:watch', function () {
  return gulp.watch(assets_src, gulp.parallel('assets'));
});

gulp.task('default', gulp.parallel('coffee', 'sass', 'pug', 'assets', 'vendor'))
gulp.task('watch', gulp.parallel('coffee:watch', 'sass:watch', 'pug:watch', 'assets:watch', 'vendor'))
