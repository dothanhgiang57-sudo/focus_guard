# Đèn Bàn — bản kết hợp

## Sửa cảnh báo nhắm mắt khi cúi đầu

Nhắm mắt kéo dài vẫn được kiểm tra khi đang cúi đầu ở cả hai chế độ học. Tư thế viết bài/đọc sách không còn che mất tín hiệu mắt nhắm; quy tắc mắt nhắm cũng không còn giới hạn ở góc cúi dưới 12°. Giữ nguyên ngưỡng độ mở mắt, làm mượt nhiều mẫu và thời gian xác nhận hiện có (mặc định 2,2 giây; mức nhẹ nhàng của độ nhạy chung là 3 giây). Khi mở mắt nhưng vẫn cúi trong chế độ màn hình, cảnh báo mắt nhắm được xóa và việc nhìn xuống được đánh giá lại theo ngưỡng riêng.

Đã thêm kiểm thử với điểm khuôn mặt tổng hợp cho nhiều góc cúi, cả hai cách học, mắt mở/mắt hẹp/mắt nhắm, chớp mắt ngắn, mở mắt trở lại, tín hiệu điện thoại/sách, thời gian chờ thực tế của ứng dụng, PiP và lịch sử. Kết quả `npm test`: **45/45 kiểm thử đạt**. Chưa thử webcam thật; khi cúi sâu hoặc mắt bị che, độ mở mắt do camera ước lượng vẫn có thể sai. Có thể dùng Mình đang học nếu bị báo nhầm.

## Phản hồi cảnh báo sai và độ nhạy riêng

Khi cảnh báo **camera AI** xuất hiện, bấm **Mình đang học** cạnh nút đóng. Âm thanh đang phát dừng ngay, cảnh báo đóng và hiện: “Đã ghi nhận. Tạm ngừng nhắc lỗi này trong 30 giây.” Nút **×** chỉ ẩn thông báo, không ghi nhận phản hồi. Cảnh báo rời tab và lỗi camera/AI không có nút phản hồi.

- Chỉ nhóm lỗi vừa phản hồi được bỏ qua: điện thoại; quay đầu/nhìn lệch (trái, phải và nhìn xuống ở chế độ màn hình); mất khuôn mặt; hoặc nhắm mắt. Các nhóm khác và quy tắc rời tab vẫn hoạt động.
- Sau 30 giây, phải có kết quả AI mới và chờ lại đủ thời gian xác nhận với ít nhất hai mẫu khác thời điểm. Khung hình chụp trước khi hết khoảng bỏ qua hoặc trả về quá chậm không được dùng để kích hoạt cảnh báo. Bằng chứng điện thoại được xóa khi hết khoảng bỏ qua để đợi các lần nhận diện mới.
- Khoảng bỏ qua tính theo thời gian thực trong cùng phiên, kể cả khi tạm dừng. Thời gian tạm dừng không tính vào học tập. Tiếp tục phải chờ mẫu mới; kết thúc, đặt lại, bắt đầu phiên mới hoặc tải lại trang đều xóa khoảng bỏ qua. Không lưu bộ đếm bỏ qua vào localStorage.
- Trước khi bắt đầu phiên, phản hồi vẫn đóng và tạm bỏ qua cảnh báo xem trước; không tạo lịch sử phiên. Bắt đầu học sẽ xóa khoảng bỏ qua này.

Trong **Cài đặt**, chọn riêng **Phát hiện điện thoại**, **Quay đầu/nhìn lệch**, **Mất khuôn mặt**. Các thời gian mới tính từ khi có tín hiệu hợp lệ:

| Loại tín hiệu | Nhẹ nhàng — đợi lâu hơn | Vừa phải — cân bằng | Nhạy hơn — nhắc sớm hơn |
| --- | --- | --- | --- |
| Điện thoại | 5 giây | 3 giây | 2 giây |
| Quay trái/phải | 3 giây | 1,8 giây | 0,9 giây |
| Nhìn xuống (chỉ chế độ màn hình) | 7 giây | 5 giây | 3 giây |
| Mất khuôn mặt | 6 giây | 4 giây | 2,5 giây |

Điện thoại vẫn cần ít nhất hai lần nhận diện vật thể mới liên tiếp trước khoảng chờ trên. Giữ nguyên ngưỡng góc, làm mượt tư thế, phục hồi 600 ms, thời gian chờ mất dấu sau tư thế viết 8 giây và thời gian xác nhận nhắm mắt. Hai cách học **Học có viết bài / đọc sách** và **Chỉ nhìn màn hình** giữ nguyên. Lựa chọn độ nhạy chung cũ còn ảnh hưởng thời gian nhắm mắt; ba lựa chọn riêng không thay đổi nó.

Cài đặt cũ được kế thừa mức độ nhạy chung và **giữ đúng thời gian chờ cũ** (điện thoại 3 giây, mất mặt 4 giây, nhìn xuống 5 giây) cho tới khi chọn lại từng loại. Mô tả bên dưới từng lựa chọn cho biết thời gian đang dùng. **Khôi phục mặc định** đưa cả ba lựa chọn riêng về Vừa phải, không thay đổi âm thanh, cách học hoặc nhắm mắt. Các lựa chọn lưu trên máy; bấm phản hồi không tự sửa độ nhạy.

### Lịch sử, thống kê và sao lưu

Mỗi cảnh báo trong phiên có mã sự kiện ổn định ngay từ khi bắt đầu. Phản hồi chỉ được chấp nhận nếu mã vẫn khớp cảnh báo hiện tại; bấm lặp không tăng hoặc trừ thêm số liệu. Giữ nguyên lý do, thời điểm và thời lượng gốc; đánh dấu **Người dùng báo cảnh báo sai** trong nhật ký và chi tiết phiên. Loại sự kiện đó khỏi số lần, thời lượng và bảng lý do xao nhãng. Nếu phiên đã lưu, cập nhật cùng mã phiên; lỗi lưu sẽ báo để bấm **Lưu phiên** thử lại.

Tỉ lệ tập trung gồm phần **ước lượng** qua camera/tab và phần **người dùng tự xác nhận**. Thời lượng sự kiện được báo sai chuyển sang tự xác nhận; thời gian đang học trong khoảng bỏ qua cũng được ghi riêng vào tự xác nhận khi không có cảnh báo khác. Các khoảng bỏ qua chồng nhau không đếm hai lần. Chi tiết phiên và bảng tổng hợp hiển thị hai nguồn riêng: tổng thời gian = ước lượng + tự xác nhận + xao nhãng. Chuỗi tập trung được tính lại khi loại sự kiện báo sai, có giữ ranh giới tạm dừng. **Phản hồi không có nghĩa AI đã xác nhận sự tập trung, không huấn luyện lại mô hình và không tự học độ nhạy.**

Xuất bản sao lưu JSON và xuất nhật ký phiên đang mở đều giữ mã, nhóm lỗi, dấu phản hồi và thời điểm phản hồi. Nhập lại trên bản này bảo toàn thông tin; vẫn đọc được JSON lịch sử cũ và định dạng backend cũ. Bản ghi dùng thêm `userConfirmed`, `estimatedFocused`, và các trường sự kiện `id`, `key`, `source`, `startElapsed`, `falsePositive`, `feedbackAt`. `focused` giữ tổng thời gian tập trung để tương thích. Bản cũ không có phản hồi được coi là chưa có thời gian tự xác nhận. Sao lưu lịch sử không bao gồm tùy chọn cài đặt, giống cơ chế trước.

### Cửa sổ nổi và giới hạn

**Document Picture-in-Picture** có nút **Mình đang học**, dùng chung xử lý và dữ liệu với trang chính. Bấm ở một nơi sẽ cập nhật cả hai; nút của cảnh báo cũ không tác động lên cảnh báo mới. Có thể dùng Tab rồi Enter/Space trên các nút và lựa chọn.

Nếu trình duyệt chỉ hỗ trợ **video PiP**, API đó không cho đặt nút HTML tương tác trong khung video. Bản dự phòng vẫn hiển thị cảnh báo, kèm hướng dẫn quay lại trang học để phản hồi; trạng thái sau phản hồi được đồng bộ vào video PiP. Không có ảnh camera trong cửa sổ nổi. Không thêm mô hình, backend, thư viện lớn hay dịch vụ ngoài; phản hồi chỉ lưu trên trình duyệt, không lưu ảnh/video hoặc gửi dữ liệu camera đi.

### Kiểm tra bản phản hồi (16/10/2026)

Kết quả cuối: **41/41 kiểm thử đạt** khi chạy `npm test` (bao gồm máy chủ localhost). Bộ kiểm tra mới dùng app thật với DOM, AudioContext, đồng hồ và kết quả AI **mô phỏng**: mã sự kiện và bấm lặp; phạm vi 30 giây; tín hiệu mới sau thời hạn; khung hình chậm/đang xử lý; tạm dừng/kết thúc/đặt lại/phiên mới; số liệu và chuỗi tập trung; cập nhật phiên đã lưu; lỗi lưu và thử lại; xuất/nhập JSON; chuyển đổi cài đặt cũ, đổi riêng và khôi phục; phản hồi hai chiều Document PiP/trang chính. Bộ kiểm tra cũ về tư thế, vật thể, worker, PiP và máy chủ vẫn được chạy.

Đã mở Chrome và xác minh các lựa chọn cùng mô tả xuất hiện trong cây truy cập giao diện. Chưa hoàn tất thao tác trực quan desktop/mobile và PiP thật vì cửa sổ Chrome đang được người dùng chuyển trang trong lúc kiểm tra. Chưa thử webcam thật, độ chính xác nhận diện hay âm lượng loa. Khi kiểm tra trình duyệt phát hiện đường dẫn WASM có dấu `/` cuối gây lỗi tải với máy chủ Node; đã sửa đường dẫn bộ nạp và thêm kiểm tra hồi quy.

Tự kiểm tra thủ công:

1. Mở bằng Go Live hoặc `npm start`, cho phép camera và hiệu chỉnh. Đổi từng lựa chọn độ nhạy, tải lại để kiểm tra lưu; thử Khôi phục mặc định.
2. Bắt đầu học, tạo một cảnh báo camera. Bấm Lưu phiên rồi Mình đang học: tiếng dừng, cảnh báo đóng, số lần giảm một. Trong Lịch sử → Xem chi tiết, sự kiện gốc vẫn còn với dấu báo sai và thời gian tự xác nhận.
3. Giữ cùng lỗi trong 30 giây và thử lỗi khác: chỉ nhóm đã phản hồi được bỏ qua. Sau thời hạn phải chờ thêm ngưỡng xác nhận mới. Nút × không làm giảm số lần.
4. Tạm dừng/tiếp tục, kết thúc hoặc đặt lại rồi bắt đầu phiên mới để kiểm tra khoảng bỏ qua không đi sang phiên khác. Thử cả hai cách học; chuyển tab ở chế độ màn hình không bị nhắc rời tab.
5. Mở cửa sổ nổi, tạo cảnh báo và bấm Mình đang học trong Document PiP, rồi thử từ trang chính. Với video PiP, quay lại trang chính để phản hồi theo hướng dẫn trên khung.
6. Xuất sao lưu, nhập lại và đối chiếu mã phiên, dấu phản hồi, số lần và các tổng thời gian. Dùng Tab/Enter/Space và cửa sổ hẹp để kiểm tra thao tác bàn phím, xuống dòng và nút bấm.

## Mở ứng dụng

1. Giải nén và mở **chính thư mục focus-guard-combined** bằng VS Code → File → Open Folder.
2. Cài tiện ích **Live Server** của Ritwick Dey trong VS Code nếu chưa có.
3. Bấm **Go Live** ở thanh dưới VS Code. index.html nằm ngay thư mục gốc nên trang ứng dụng được mở trực tiếp. Có thể nhấp phải index.html → Open with Live Server.
4. Trình duyệt mở giao diện. AI tự tải và camera tự bật. Lần đầu chọn Allow/Cho phép camera. Nhìn thẳng, mở mắt khoảng 4 giây để hiệu chỉnh.

Riêng các chức năng tập trung và camera không cần Python, npm, terminal, backend, setup.bat hoặc run.bat. Giữ nguyên vendor, models và các file JS khi giải nén. Mô hình và WASM có sẵn: không phải tải từ CDN khi mở ứng dụng. Chỉ Go Live từ localhost/127.0.0.1 (hoặc HTTPS khi triển khai); mở HTML bằng file:// không được hỗ trợ.

## Cửa sổ trạng thái nổi khi chuyển tab (Picture-in-Picture)

- PiP chỉ hiển thị **trạng thái tập trung** (nhìn thẳng, sang trái/phải, cúi đầu, nhắm mắt, mất khuôn mặt…), **thời gian còn lại** của phiên và **cảnh báo**. Không hiển thị hình ảnh camera trong PiP. Khi có cảnh báo đã đủ ngưỡng, toàn bộ nền khung chuyển sang đỏ, kèm nội dung cảnh báo; hết cảnh báo thì trở lại nền bình thường.
- Bật camera, giữ **Tự mở PiP khi chuyển tab** rồi chuyển sang tab khác. Chrome hỗ trợ tự mở khi trang đang dùng camera và được cho phép **Automatic picture-in-picture**. Nếu trình duyệt hỏi quyền, chọn cho phép; nếu từng chặn, đổi lại trong quyền của trang. Xem [điều kiện tự mở PiP của Chrome](https://developer.chrome.com/blog/automatic-picture-in-picture).
- Có thể bấm **Mở cửa sổ nổi** trước khi chuyển tab. Bảng chữ dùng [Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) khi có hỗ trợ; trình duyệt chỉ hỗ trợ video PiP sẽ hiển thị bảng chữ được vẽ bằng canvas, vẫn không có ảnh camera. Nếu cả hai cách đều không được hỗ trợ, giao diện sẽ báo rõ.
- Nhận diện AI tiếp tục cập nhật khi PiP đang mở, kể cả tab học ở nền. Chế độ **Chỉ nhìn màn hình** vẫn cho phép chuyển tab; trong PiP, các cảnh báo từ camera như quay đầu lâu hoặc nghi nhìn điện thoại vẫn hoạt động. Chế độ học có viết bài giữ lời nhắc rời tab như trước. Nếu camera không có kết quả mới quá 8 giây, bảng báo **Chưa cập nhật camera** thay vì giữ một trạng thái tập trung cũ.
- Cửa sổ tự mở sẽ đóng khi quay lại tab học; cửa sổ mở thủ công giữ lại cho tới khi bạn đóng. Tạm dừng phiên hoặc tắt camera sẽ đóng cửa sổ nổi. Tùy chọn tự mở được nhớ riêng trên trình duyệt. Khi đóng PiP và tab học vẫn ở nền, nhận diện AI lại tạm ngừng.


## Chạy bằng Node.js (tùy chọn)

Cài Node.js 22 trở lên, chạy `npm start` trong thư mục dự án và mở **http://127.0.0.1:8787/**. Có thể đổi `PORT` trong `.env` (tham khảo `.env.example`). Máy chủ chỉ phục vụ tệp ứng dụng trên localhost.

Chạy `npm test` để kiểm tra. Lịch sử được lưu theo địa chỉ/cổng: nếu đổi từ Live Server sang cổng 8787, hãy xuất bản sao lưu trên trang cũ rồi nhập trên trang mới.

## Chức năng ghép từ focus-guard 2.zip

- Bắt đầu, tạm dừng/tiếp tục, **Lưu phiên** ngay trong lúc học và **Đặt lại**. Lưu nhiều lần cập nhật một phiên; kết thúc phiên tự cập nhật bản lưu.
- Bảng kỷ lục: số phiên, tổng giờ học, tỉ lệ trung bình mỗi phiên, tỉ lệ tốt nhất, phiên dài nhất và chuỗi tập trung dài nhất.
- Thống kê 10 lý do xao nhãng thường gặp cùng số lần và tổng thời lượng.
- Xem chi tiết từng phiên, thời gian xảy ra và độ dài từng lần xao nhãng; xóa riêng từng phiên.
- Xuất/nhập bản sao lưu JSON. Khi nhập, giữ các phiên hiện có và cập nhật phiên trùng mã sau khi xác nhận. Hỗ trợ dạng bản ghi durationMs/focusedMs/distractions của backend trong file đính kèm, nếu được xuất thành mảng JSON.

**Cách lưu:** bản đính kèm dùng SQLite qua Node.js; bản kết hợp dùng localStorage để chạy bằng Go Live. Không cần chạy backend. Không đồng bộ nhiều máy, dữ liệu gắn với trình duyệt và địa chỉ/cổng đang dùng. Giữ cổng Go Live ổn định; xuất bản sao lưu trước khi đổi máy hoặc xóa dữ liệu. Giới hạn 1.000 phiên; khi đầy hoặc hết dung lượng trình duyệt, ứng dụng báo không lưu được. Chưa lưu được thì có thể xuất nhật ký phiên đang mở.

Lịch sử từ các bản trước trên cùng địa chỉ được đọc tiếp. Những phiên cũ không có nhật ký chi tiết/chuỗi dài nhất sẽ không được tự bịa thêm thông tin. Đặt lại chỉ bỏ phần hiện tại chưa lưu, không xóa bản đã lưu.

## Tối ưu phân biệt điện thoại và máy tính cầm tay (Mới)

- **Phân loại đa danh mục (Multi-category detection)**: Bổ sung lớp nhận diện `remote` (thiết bị bấm phím cầm tay) cùng `cell phone` và `book`. Mô hình COCO thường nhận diện máy tính cầm tay (Casio fx-580, fx-570...) là `remote` hoặc kết hợp giữa `remote` và `cell phone` do có nhiều nút bấm vật lý.
- **Phân tích kết cấu ma trận phím (Button Grid Texture)**: Tự động phân tích mật độ chuyển tiếp gradient ngang/dọc trong nửa dưới của vật thể để phát hiện lưới phím bấm cơ học của máy tính cầm tay, phân biệt với mặt kính phẳng hoặc màn hình cảm ứng điện thoại.
- **Lọc hình học và tư thế học (Geometry & Posture Filter)**: Trong tư thế viết bài / cúi đầu, vật thể nằm trên bàn có độ nén góc nhìn phối cảnh (aspect ratio 0.7–1.65) và độ tin cậy vừa phải được nhận diện là `calculator` (`Đang dùng máy tính cầm tay · Phù hợp tự học`) thay vì báo nhầm điện thoại.
- **Tự thích ứng từ phản hồi "Mình đang học"**: Khi người dùng phản hồi báo sai trên cảnh báo điện thoại, hệ thống sẽ tự động ghi nhớ tọa độ vật dụng học tập trên bàn trong suốt phiên học, loại bỏ tình trạng cảnh báo lặp lại sau mỗi 30 giây.
- **Tùy chọn Cài đặt**: Bổ sung công tắc **Tối ưu chống nhầm máy tính cầm tay** trong mục Cài đặt (mặc định bật) để người dùng có thể chủ động bật/tắt.

## Nhận diện điện thoại / sách và camera không có điểm xanh

- Đã bỏ lớp điểm xanh trên video; AI khuôn mặt vẫn chạy, hiển thị hướng đầu và góc ngang bằng chữ.
- Thêm mô hình **EfficientDet-Lite2 int8 v1** để nhận diện `cell phone` và `book`, chạy cục bộ trong Web Worker cùng Face Landmarker. File `models/efficientdet_lite2.tflite` đã có sẵn; không tải mô hình từ Internet khi mở ứng dụng.
- Mô hình vật thể chạy tối đa mỗi giây một lần. Cảnh báo **Có thể đang nhìn điện thoại** hoạt động khi đã hiệu chỉnh và đang nhìn thẳng hoặc cúi đầu. Điện thoại có thể ở ngang mặt hoặc phía dưới, gần khuôn mặt; vẫn cần độ tin cậy từ 55%, ít nhất hai lần nhận diện mới liên tiếp và sau đó giữ tín hiệu thêm ít nhất 3 giây. Chuyển giữa nhìn thẳng và cúi đầu không xóa bằng chứng điện thoại còn mới. Cảnh báo được ghi vào số lần xao nhãng và nhật ký phiên như các lý do khác.
- Khi cúi và thấy sách với độ tin cậy từ 50%, hiển thị **Có thể đang đọc**. Chế độ học có viết bài cho phép tư thế này. Nếu cả điện thoại và sách cùng xuất hiện, tín hiệu điện thoại vẫn được kiểm tra. Chế độ chỉ màn hình vẫn giữ quy tắc nhắc nhìn xuống lâu.
- Không thấy vật thể không có nghĩa là đang đọc sách. Giao diện báo **Chưa phân biệt được** khi chỉ thấy cúi đầu hoặc mất khuôn mặt. Giấy viết, sách bị che, điện thoại nhỏ/tối hoặc ngoài khung hình có thể không nhận ra. Đặt camera thấy cả mặt và vùng bàn học để tăng khả năng nhận diện.
- Đây là nhận diện vật thể kết hợp tư thế đầu, chưa phải mô hình nhận diện hành động hoặc theo dõi ánh nhìn. Điện thoại nằm trên bàn gần bạn cũng có thể gây cảnh báo dù đang nhìn thẳng; chưa thể xác định nội dung trên điện thoại là học tập hay giải trí. Không lưu hoặc tải ảnh camera lên máy chủ.
- Nếu AI vật thể lỗi, trạng thái báo rõ; AI khuôn mặt vẫn hoạt động. Giữ nguyên file mô hình và tải lại trang để thử lại.

Bản sửa cảnh báo khi nhìn thẳng có kiểm tra logic cho điện thoại ngang mặt/phía dưới, chuyển tư thế, bằng chứng cũ, mất khuôn mặt, lỗi mô hình và thời gian chờ cảnh báo. Các kiểm tra mới dùng dữ liệu mô phỏng, chưa thử webcam thật.

Kiểm tra bản trước: 5 bộ kiểm tra Node (giao diện, hướng đầu, bản ghi, phân biệt vật thể/tư thế, Web Worker) đã qua. Đã khởi tạo hai mô hình thật trong Chrome với camera giả lập, chạy nhận diện trên 10 ảnh mẫu COCO và kiểm tra giao diện desktop/mobile, không có yêu cầu mạng ra bên ngoài. Mô hình nhận ra điện thoại và sách rõ trong một số ảnh; nhiều vật thể nhỏ/bị che không vượt ngưỡng. Đây là kiểm tra hoạt động, không phải phép đo độ chính xác trên webcam. Chưa thử với webcam thật của người dùng.

Tài liệu mô hình và API: [Google MediaPipe Object Detector](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector), [hướng dẫn Web](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector/web_js).

## AI và âm thanh được giữ lại

## Thay đổi trong bản này

- **Chỉ nhìn màn hình**: chuyển tab không hiện lời nhắc, không phát tiếng, không tăng số lần rời tab hoặc xao nhãng. Chế độ học có viết bài vẫn nhắc rời tab như trước.
- Khi tab học ở nền và không mở PiP, xử lý camera tạm ngừng; quay lại sẽ đánh giá khung hình mới và chờ đủ ngưỡng cảnh báo. Thời gian chuyển tab ở chế độ màn hình không bị trừ khỏi thời gian tập trung trong lúc không theo dõi. Khi PiP đang mở, AI tiếp tục đánh giá camera và ghi nhận cảnh báo vào phiên học.

- Mặc định **Học có viết bài / đọc sách**: cho phép cúi xuống học, nhưng vẫn nhắc nếu phát hiện mắt nhắm kéo dài. Có thể đổi sang **Chỉ nhìn màn hình** ở ngay dưới camera.
- Nếu mất dấu khuôn mặt ngay sau tư thế viết, chờ 8 giây trước khi chuyển sang kiểm tra vắng mặt (rồi thêm 4 giây chờ cảnh báo). Điều này giảm báo nhầm lúc cúi sâu, đồng thời vẫn nhắc khi vắng mặt kéo dài.
- Ngưỡng vào/thoát quay đầu khác nhau, làm mượt 3 khung hình, hiệu chỉnh chỉ hoàn thành khi giữ tư thế ổn định khoảng 4 giây.
- Cảnh báo nổi phía trên màn hình với chữ lớn, nền cam và viền đậm; vẫn thấy khi cuộn trang hoặc chuyển sang Lịch sử/Cài đặt. Có nút đóng cảnh báo.
- Hai tiếng nhắc rõ và dài hơn, âm lượng mặc định 80%; chỉnh 0–100% và thử tiếng ngay trong Cài đặt. Âm lượng 0% không phát tiếng. Nhắc lại sau 12 giây nếu vẫn xao nhãng. Bấm **Bật / thử tiếng nhắc** để cấp phép âm thanh và kiểm tra loa. Tắt âm thanh trong Cài đặt nếu cần.

Đây là cải tiến luật đánh giá trên kết quả tracking, không phải mô hình đã được huấn luyện lại để nhận ra hành vi viết. AI khuôn mặt riêng lẻ không phân biệt chắc chắn viết bài với nhìn điện thoại; AI vật thể mới bổ sung tín hiệu khi thấy điện thoại hoặc sách. Chế độ ghi chép cho phép tư thế nhìn xuống nếu chưa có tín hiệu nghi dùng điện thoại. Nhắm mắt kéo dài vẫn được kiểm tra khi đang cúi, miễn camera còn theo dõi được mắt. Ngưỡng cần thử thêm với webcam và góc ngồi của bạn.

## Sử dụng

- Theo dõi khuôn mặt tự hoạt động trước khi bắt đầu phiên. Không hiện điểm bám; có góc ngang, hướng trái/phải/cúi đầu, mắt nhắm và cảnh báo rời khung hình.
- Bấm Bắt đầu tập trung để chạy đồng hồ và lưu thống kê phiên. Khi bắt đầu phiên, hiệu chỉnh được làm lại.
- Quay đầu trái/phải trên 25° (phục hồi dưới 18°); chế độ chỉ màn hình nhắc cúi trên 20° và giữ đủ thời gian sẽ hiện lời nhắc. Độ nhạy quay đầu mặc định 1,8 giây; đổi trong Cài đặt. Mắt nhắm chờ ít nhất 2,2 giây; mất khuôn mặt 4 giây; nhìn xuống trong chế độ chỉ màn hình 5 giây. Trái/phải theo phía của người dùng; góc dương là trái, video như gương.
- Hiệu chỉnh lại hoạt động cả trước khi bắt đầu phiên. Nhìn thẳng lúc hiệu chỉnh.
- Âm thanh cần thao tác đầu tiên trên trang do giới hạn trình duyệt. Cảnh báo chữ vẫn hiển thị tự động.
- Tạm dừng ngừng xử lý camera và bộ đếm. Tắt camera trong phiên theo dõi sẽ tạm dừng. Cho phép camera, bật lại rồi tiếp tục.
- Camera bị từ chối: cho phép trong thanh địa chỉ và bấm Bật camera. Nếu không muốn dùng camera, bỏ chọn Theo dõi khuôn mặt trong phiên học trước khi bắt đầu.

## Công nghệ

MediaPipe Tasks Vision 0.10.21 + Face Landmarker float16 v1 + EfficientDet-Lite2 int8 v1 chạy bằng WebAssembly trong Web Worker. Ảnh xử lý ngay trong trình duyệt, không gọi API backend hoặc gửi ảnh lên dịch vụ ngoài. Worker dùng bản classic-script chuyển từ các export của gói ESM để tương thích bộ nạp WASM importScripts. Bản ESM gốc giữ trong vendor cùng giấy phép Apache 2.0.

Hướng đầu lấy từ ma trận biến đổi khuôn mặt 3D, so với tư thế chuẩn. Mắt nhắm dựa trên độ mở mắt. Những tín hiệu này không chứng minh sự tập trung; đọc sách, ánh sáng yếu, kính hoặc góc camera có thể làm cảnh báo sai. Nên dùng Chrome/Edge bản mới có WebAssembly, Web Worker, OffscreenCanvas và WebGL.

## Kiểm tra bản cải tiến

Đã chạy các kiểm tra logic với dữ liệu tổng hợp và DOM/AudioContext mô phỏng: viết bài với mắt hẹp, ngưỡng quay đầu, hết thời gian mất dấu, chế độ màn hình, hai tiếng chuông, lặp có giới hạn và tắt âm thanh. Chưa thử âm lượng loa hoặc độ chính xác trên webcam thật cho bản cải tiến.

## Kiểm tra nền tảng ở bản trước

- Khởi tạo mô hình AI thật trong Chromium, xử lý khung hình camera mô phỏng và ảnh chân dung có mặt (phát hiện 51 điểm hiển thị, hiệu chỉnh thành công), xác nhận không gọi backend hoặc URL bên ngoài.
- Kiểm tra giao diện máy tính và điện thoại, đồng hồ khi tạm dừng.
- Kiểm tra JS với DOM mô phỏng: tự bật AI/camera, cảnh báo, hiệu chỉnh, lưu lịch sử, quyền camera bị từ chối và AI lỗi.
- Kiểm tra góc đầu trái/phải/cúi và mắt bằng dữ liệu tổng hợp. Chưa đo độ chính xác trên webcam thật của người dùng.

Chạy kiểm tra logic (chỉ cho phát triển, không cần để sử dụng):

```
node tests/frontend.cjs
node tests/activity.cjs
node tests/worker.cjs
node tests/pose.cjs
node tests/records.cjs
```

Tài liệu MediaPipe: 

## Kiểm tra bản kết hợp

Đã qua kiểm tra logic AI/âm thanh, lưu nhiều lần không trùng, kết thúc cập nhật đúng phiên, nhật ký đang diễn ra không đếm hai lần, đặt lại giữ lịch sử, đọc dữ liệu cũ, nhập định dạng backend, tính bảng tổng hợp và xử lý lỗi hết dung lượng. Giao diện mới và webcam thật vẫn cần thử trên máy người dùng.
