<?php
/**
 * Template Name: Branches Template
 */
global $post;

get_header(); ?>

<div class="wrap">

	<header class="page-header">
		<h1 class="page-title"><?php echo get_post_field('post_title', $post->ID); ?></h1>
	</header>

	<div id="primary" class="content-area">
		<main id="main" class="site-main" role="main">
			<?php echo get_post_field('post_content', $post->ID); ?>
			<div id="search-panel">
				<input id="address" type="text" value="<?php echo $address; ?>" placeholder="Enter your address">
				Max distance (km): <select id="maxDistance">
					<option>100</option>
					<option>200</option>
					<option>300</option>
				</select>
				<input id="search-btn" type="button" value="Search">
				<input id="geolocation-btn" type="button" value="Geolocation">
				<input id="reset-search-btn" type="button" value="Reset">
			</div>
			<div class="acf-map"></div>
			<div id="map-spinner">
				Loading...
			</div>
			<div id="map-info"></div>
		</main><!-- #main -->
	</div><!-- #primary -->
</div><!-- .wrap -->

<?php get_footer();
