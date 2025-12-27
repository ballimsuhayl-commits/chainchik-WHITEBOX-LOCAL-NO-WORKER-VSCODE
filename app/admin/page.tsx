export default function AdminHome() {
  return (
    <div style={{display:"grid",gap:12}}>
      <h1 style={{margin:0}}>Admin</h1>
      <div style={{color:"#666"}}>Welcome 😊 Choose a section:</div>
      <ul>
        <li><a href="/admin/dashboard">Dashboard</a></li>
        <li><a href="/admin/products">Products & inventory</a></li>
        <li><a href="/admin/collections">Collections</a></li>
        <li><a href="/admin/orders">Orders</a></li>
        <li><a href="/admin/system">System</a></li>
        <li><a href="/admin/support">Support</a></li>
        <li><a href="/admin/templates">Templates</a></li>
        <li><a href="/admin/inbox">Inbox</a></li>
        <li><a href="/admin/ai">AI Inbox</a></li>
        <li><a href="/admin/waitlist">Waitlist</a></li>
        <li><a href="/admin/setup">Setup</a></li>
        <li><a href="/admin/users">Users</a></li>
        <li><a href="/admin/variants">Variants</a></li>
        <li><a href="/admin/bulk">Bulk</a></li>
        <li><a href="/admin/dead-letter">Retries</a></li>
              <li><a href="/admin/logout">Logout</a></li>
              <li><a href="/admin/customers">Customers</a></li>
      </ul>
    </div>
  );
}
