<?php
/**
 * author: pawel.szczepanski@nopio.com, nopio.com 
 * Based on Twenty Seventeen theme
 *
 * IMPORTANT Only code parts relevant for the geolocation map feature are shown here
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 */

//Remember to put the key in wp-config.php
//define( 'GOOGLE_API_KEY', '[my-key]' );

//Theme code...

/**
 * Enqueue scripts and styles.
 */
function twentyseventeen_scripts() {

	//twentyseventeen_scripts() theme code ...

	if( is_page_template( 'branches-template.php' ) ) {

		wp_enqueue_script( 'google-api', 'https://maps.googleapis.com/maps/api/js?key=' . GOOGLE_API_KEY . '&libraries=geometry,places&callback=initAutocomplete', array(), null, true );
		wp_enqueue_script( 'branches', get_theme_file_uri( '/assets/js/branches.js' ), array(), false, true );
	}
}
add_action( 'wp_enqueue_scripts', 'twentyseventeen_scripts' );

//Theme code...

require get_parent_theme_file_path( '/inc/custom-post-type.php' );

//Add Google API key for ACF
//https://www.advancedcustomfields.com/resources/google-map/
add_filter('acf/fields/google_map/api', 'add_acf_google_map_api');
function add_acf_google_map_api( $api ){
	$api['key'] = GOOGLE_API_KEY;
	return $api;
}

//Add Google API key for ACF Pro
//https://www.advancedcustomfields.com/resources/google-map/
/*add_action('acf/init', 'add_acfpro_google_map_api');
function add_acfpro_google_map_api() {
	acf_update_setting('google_api_key', GOOGLE_API_KEY);
}*/

function branches_json() {
	global $post;
	$branches = array();

	$args  = array(
		'post_type' => 'branch',
		'nopaging' => true
	);

	$query = new WP_Query( $args );

	if( $query->have_posts() ) {
		while( $query->have_posts() ) {

			$query->the_post();
			$location = get_field( 'location' );

			$branches[$post->ID] = array(
				'id' 		=> $post->ID,
				'title'		=> get_post_field( 'post_title', $post->ID ), 
				'address'	=> get_field( 'address' ),
				'lat'		=> empty( $location ) ? '' : $location['lat'],
				'lng'		=> empty( $location ) ? '' : $location['lng'],
				'link'		=> get_permalink(),
			);
		}
		wp_reset_postdata();
	}
	return json_encode( $branches );
}

function footer_scripts() {
	if( is_page_template( 'branches-template.php' ) ) { ?>
		<script>
			var branches = <?php echo branches_json(); ?>;
			function initAutocomplete() {
				console.log('initAutocomplete');
				var field = document.getElementById('address');
				var autocomplete = new google.maps.places.Autocomplete(
						(field),
						{types: ['geocode']}
					);
			}
		</script>
		<?php
	}
}
