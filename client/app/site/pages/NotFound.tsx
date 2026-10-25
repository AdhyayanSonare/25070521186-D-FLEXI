import {Link} from 'react-router-dom';
export default function NotFound(){
 return <div className="container"><div className="empty tall"><h1 className="display">This page does not exist.</h1><p>The address may be mistyped, or the page may have moved.</p><Link to="/" className="btn btn-dark">Go to the home page</Link></div></div>;
}
