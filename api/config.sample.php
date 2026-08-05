<?php

/**
 * Copy this file to config.php and fill in the four things below.
 * That is the whole configuration.
 *
 * config.php is git-ignored on purpose: it holds the database password.
 */

return [
    // 1. The database you created in cPanel → MySQL® Databases.
    //    Use a NEW database, not the one the current live site uses.
    'db' => [
        'host' => 'localhost',
        'name' => 'CHANGE_ME_database',
        'user' => 'CHANGE_ME_user',
        'pass' => 'CHANGE_ME_password',
    ],

    // 2. The website(s) allowed to use this API. A browser blocks calls from
    //    anywhere else. localhost is always allowed, for development.
    //    One address, or a list while the revamp is still on a preview host:
    //
    //      'site_url' => ['https://teask.asia', 'https://name.netlify.app'],
    'site_url' => 'https://teask.asia',

    // 3. The studio login, created once by seed.php.
    'admin' => [
        'email'    => 'studio@teask.asia',
        'password' => 'CHANGE_ME_strong_password',
        'name'     => 'Teask Team',
    ],
];
