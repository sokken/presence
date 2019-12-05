/*©agpl*************************************************************************
*                                                                              *
* This file is part of FRIEND UNIFYING PLATFORM.                               *
*                                                                              *
* This program is free software: you can redistribute it and/or modify         *
* it under the terms of the GNU Affero General Public License as published by  *
* the Free Software Foundation, either version 3 of the License, or            *
* (at your option) any later version.                                          *
*                                                                              *
* This program is distributed in the hope that it will be useful,              *
* but WITHOUT ANY WARRANTY; without even the implied warranty of               *
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the                 *
* GNU Affero General Public License for more details.                          *
*                                                                              *
* You should have received a copy of the GNU Affero General Public License     *
* along with this program.  If not, see <http://www.gnu.org/licenses/>.        *
*                                                                              *
*****************************************************************************©*/

'use strict';

require( './component/Config' ); // writes to global.config
const log = require( './component/Log' )( 'main' );
const MySQLPool = require( './component/MysqlPool' );
const IdCache = require( './component/IdentityCache' );
const WorgCtrl = require( './component/WorgCtrl' );
const UserCtrl = require( './component/UserCtrl' );
const RoomCtrl = require( './component/RoomCtrl' );
const NML = require( './component/NoMansLand' );

const FService = require( './api/FService' );
//log( 'conf', global.config, 4 );


let service = null;
let worgList = null;
const presence = {
	conn  : null,
	db    : null,
	idc   : null,
	worgs : null,
	users : null,
	rooms : null,
};

if ( global.config.server.friendcore.serviceKey ) {
	service = new FService(
		global.config.server.friendcore,
		'FriendChat',
	);
	
	let gId = service.on( 'group', e => {
		if ( 'list' !== e.type )
			return;
		
		worgList = e.data;
		service.off( gId );
		if ( presence.worgs )
			presence.worgs.update( worgList );
		
	});
}

//const fcReq = require( './component/FCRequest' )( global.config.server.friendcore );


presence.db = new MySQLPool( global.config.server.mysql, dbReady );
function dbReady( ok ) {
	if ( !ok )
		throw new Error( 'db failed! Run for the hills!' );
	
	presence.idc = new IdCache( presence.db );
	presence.worgs = new WorgCtrl( presence.db, presence.idc );
	presence.rooms = new RoomCtrl( presence.db, presence.idc, presence.worgs );
	presence.users = new UserCtrl( presence.db, presence.idc, presence.worgs, presence.rooms );
	if ( worgList )
		presence.worgs.update( worgList );
	
	openComms();
}

function openComms() {
	const fcReq = require( './component/FCRequest' )( global.config.server.friendcore );
	presence.conn = new NML(
		presence.db,
		presence.users,
		presence.rooms,
		fcReq
	);
}

process.on( 'unhandledRejection', err => {
	log( 'unhandled promise rejection - ERRPR', err, 3 );
	//process.exit( 666 );
});