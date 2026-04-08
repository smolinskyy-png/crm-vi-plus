require 'socket'
require 'uri'

dir = "/Users/olehsmolinskyy/Documents/Claude/Projects/CRM VI PLUS"
server = TCPServer.new('127.0.0.1', 8090)
puts "Serving on http://127.0.0.1:8090"
$stdout.flush

loop do
  client = server.accept
  request = client.gets
  next unless request
  path = URI.decode_www_form_component(request.split(' ')[1] || '/')
  path = '/index.html' if path == '/'
  full = File.join(dir, path)
  if File.exist?(full) && !File.directory?(full)
    body = File.binread(full)
    ext = File.extname(full).downcase
    ct = case ext
    when '.html' then 'text/html; charset=utf-8'
    when '.js' then 'application/javascript'
    when '.css' then 'text/css'
    when '.json' then 'application/json'
    when '.png' then 'image/png'
    when '.jpg','.jpeg' then 'image/jpeg'
    when '.svg' then 'image/svg+xml'
    else 'application/octet-stream'
    end
    client.print "HTTP/1.1 200 OK\r\nContent-Type: #{ct}\r\nContent-Length: #{body.bytesize}\r\nConnection: close\r\n\r\n"
    client.print body
  else
    client.print "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nNot Found"
  end
  client.close
end
