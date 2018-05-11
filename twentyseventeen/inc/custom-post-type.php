<?php

class Custom_Post_Type {

	function __construct() {
		add_action( 'init', array( $this, 'register_branch' ), 999 );
	}

	function register_branch() {
		$args = array(
			'labels' => array(
				'name' => __( 'Branches' ),
				'singular_name' => __( 'Branch' )
			),
			'menu_icon'  => 'dashicons-hammer',
			'public' => true,
			'has_archive' => false
		);

		register_post_type( 'branch', $args );
	}
}

new Custom_Post_Type();