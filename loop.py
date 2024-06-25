import time
import os

previous_line_count = None

def count_lines(file_path):
    with open(file_path, 'r') as file:
        return sum(1 for line in file)

def check_file_changes(file_path):
    global previous_line_count
    current_line_count = count_lines(file_path)
    print(current_line_count)

    if previous_line_count is None:
        previous_line_count = current_line_count
        return False

    if current_line_count != previous_line_count:
        previous_line_count = current_line_count
        return True

    return False

def monitor_file(file_path):
    while True:
        has_changed = check_file_changes(file_path)
        print(f"File đã thay đổi: {has_changed}")
        time.sleep(150)  # Đợi 60 giây trước khi kiểm tra lại
        if not has_changed:
            take_loop()

def take_loop():
    os.system("kill $(pgrep node)")

if __name__ == "__main__":
    file_path = 'nohup.out'
    
    if not os.path.exists(file_path):
        print(f"File không tồn tại: {file_path}")
    else:
        monitor_file(file_path)