<?php
/**
 * Plugin Name: Headless Commerce Connector
 * Plugin URI:  https://github.com/suphakin-th/headless-commerce-engine
 * Description: Exposes a custom REST endpoint that pushes content change events to the
 *              headless backend API, enabling real-time content sync without polling.
 * Version:     1.0.0
 * Author:      suphakin-th
 * License:     MIT
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'HCC_VERSION', '1.0.0' );
define( 'HCC_OPTION_BACKEND_URL', 'hcc_backend_url' );
define( 'HCC_OPTION_SECRET', 'hcc_webhook_secret' );

// ─── REST API ──────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {

    // GET /wp-json/hcc/v1/content — returns all published posts + pages
    register_rest_route( 'hcc/v1', '/content', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'hcc_get_all_content',
        'permission_callback' => 'hcc_verify_secret',
    ] );

    // POST /wp-json/hcc/v1/invalidate — called by the headless backend to bust a cache entry
    register_rest_route( 'hcc/v1', '/invalidate', [
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'hcc_invalidate_cache',
        'permission_callback' => 'hcc_verify_secret',
    ] );
} );

function hcc_verify_secret( WP_REST_Request $request ): bool {
    $secret = get_option( HCC_OPTION_SECRET, '' );
    if ( empty( $secret ) ) {
        return false; // Deny until a secret is configured — fail closed.
    }
    return hash_equals( $secret, $request->get_header( 'X-HCC-Secret' ) ?? '' );
}

function hcc_get_all_content( WP_REST_Request $request ): WP_REST_Response {
    $per_page = (int) ( $request->get_param( 'per_page' ) ?: 100 );

    $posts = get_posts( [
        'post_type'      => [ 'post', 'page' ],
        'post_status'    => 'publish',
        'posts_per_page' => $per_page,
        'orderby'        => 'modified',
        'order'          => 'DESC',
    ] );

    $data = array_map( 'hcc_format_post', $posts );

    return new WP_REST_Response( [
        'data'       => $data,
        'total'      => count( $data ),
        'generated'  => gmdate( 'c' ),
    ], 200 );
}

function hcc_format_post( WP_Post $post ): array {
    $thumbnail_url = null;
    if ( has_post_thumbnail( $post->ID ) ) {
        $thumbnail_url = get_the_post_thumbnail_url( $post->ID, 'large' );
    }

    return [
        'id'              => $post->ID,
        'type'            => $post->post_type,
        'title'           => get_the_title( $post->ID ),
        'slug'            => $post->post_name,
        'excerpt'         => wp_strip_all_tags( get_the_excerpt( $post ) ),
        'content'         => apply_filters( 'the_content', $post->post_content ),
        'date'            => $post->post_date_gmt,
        'modified'        => $post->post_modified_gmt,
        'featuredImage'   => $thumbnail_url,
        'link'            => get_permalink( $post->ID ),
    ];
}

function hcc_invalidate_cache( WP_REST_Request $request ): WP_REST_Response {
    $post_id = (int) $request->get_param( 'postId' );
    if ( $post_id > 0 ) {
        clean_post_cache( $post_id );
    }
    return new WP_REST_Response( [ 'invalidated' => $post_id ], 200 );
}

// ─── Outgoing Webhooks ─────────────────────────────────────────────────────────

add_action( 'save_post', 'hcc_notify_backend', 10, 2 );
add_action( 'trash_post', 'hcc_notify_backend_deleted' );

function hcc_notify_backend( int $post_id, WP_Post $post ): void {
    if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
        return;
    }
    if ( ! in_array( $post->post_type, [ 'post', 'page' ], true ) ) {
        return;
    }

    $backend_url = get_option( HCC_OPTION_BACKEND_URL );
    if ( empty( $backend_url ) ) {
        return;
    }

    wp_remote_post( trailingslashit( $backend_url ) . 'webhooks/wordpress/content', [
        'headers' => [
            'Content-Type'   => 'application/json',
            'X-WP-Event'     => 'post.saved',
            'X-HCC-Secret'   => get_option( HCC_OPTION_SECRET, '' ),
        ],
        'body'    => wp_json_encode( [
            'event'   => 'post.saved',
            'postId'  => $post_id,
            'status'  => $post->post_status,
            'type'    => $post->post_type,
            'slug'    => $post->post_name,
        ] ),
        'timeout' => 5,
        'blocking' => false,
    ] );
}

function hcc_notify_backend_deleted( int $post_id ): void {
    $backend_url = get_option( HCC_OPTION_BACKEND_URL );
    if ( empty( $backend_url ) ) {
        return;
    }

    wp_remote_post( trailingslashit( $backend_url ) . 'webhooks/wordpress/content', [
        'headers' => [
            'Content-Type' => 'application/json',
            'X-WP-Event'   => 'post.deleted',
            'X-HCC-Secret' => get_option( HCC_OPTION_SECRET, '' ),
        ],
        'body'    => wp_json_encode( [ 'event' => 'post.deleted', 'postId' => $post_id ] ),
        'timeout' => 5,
        'blocking' => false,
    ] );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

add_action( 'admin_menu', function () {
    add_options_page(
        'Headless Commerce Connector',
        'HCC Settings',
        'manage_options',
        'hcc-settings',
        'hcc_render_settings_page'
    );
} );

add_action( 'admin_init', function () {
    register_setting( 'hcc_settings_group', HCC_OPTION_BACKEND_URL );
    register_setting( 'hcc_settings_group', HCC_OPTION_SECRET );
} );

function hcc_render_settings_page(): void {
    ?>
    <div class="wrap">
        <h1>Headless Commerce Connector</h1>
        <form method="post" action="options.php">
            <?php settings_fields( 'hcc_settings_group' ); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">Backend API URL</th>
                    <td>
                        <input type="url" name="<?php echo esc_attr( HCC_OPTION_BACKEND_URL ); ?>"
                               value="<?php echo esc_attr( get_option( HCC_OPTION_BACKEND_URL ) ); ?>"
                               class="regular-text" placeholder="http://localhost:3000" />
                        <p class="description">Your NestJS backend base URL.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Shared Secret</th>
                    <td>
                        <input type="password" name="<?php echo esc_attr( HCC_OPTION_SECRET ); ?>"
                               value="<?php echo esc_attr( get_option( HCC_OPTION_SECRET ) ); ?>"
                               class="regular-text" />
                        <p class="description">Sent as X-HCC-Secret header to authenticate webhook calls.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
